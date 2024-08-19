/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
"use strict";

const axios = require("axios");
const EventEmitter = require("events");
const util = require("./util");
const WebSocket = require("ws");
const WebSocketAsPromised = require("websocket-as-promised");

module.exports = class eWeLinkWS {
  constructor(config, log, res) {
    this.config = config;
    this.log = log;
    this.debug = this.config.debug || false;
    this.debugReqRes = this.config.debugReqRes || false;
    this.httpHost = res.httpHost;
    this.aToken = res.aToken;
    this.apiKey = res.apiKey;
    this.wsIsOpen = false;
    this.emitter = new EventEmitter();
  }

  async getHost() {
    try {
      const res = await axios.post(
        `https://${this.httpHost.replace("-api", "-disp")}/dispatch/app`,
        {
          appid: util.appId,
          nonce: Math.random().toString(36).substr(2, 8),
          ts: Math.floor(Date.now() / 1000),
          version: 8,
        },
        {
          headers: {
            Authorization: `Bearer ${this.aToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const body = res.data;
      if (!body.domain) {
        throw new Error("Server did not respond with a web socket host.");
      }
      if (this.debug) this.log(`Web socket host received [${body.domain}].`);
      this.wsHost = body.domain;
    } catch (err) {
      if (util.hasProperty(err, "code") && util.httpRetryCodes.includes(err.code)) {
        if (this.debug) this.log("Unable to reach eWeLink. Retrying in 30 seconds.");
        await util.sleep(30000);
        return this.getHost();
      } else {
        throw err;
      }
    }
  }

  login() {
    this.wsp = new WebSocketAsPromised(`wss://${this.wsHost}:8080/api/ws`, {
      createWebSocket: (url) => new WebSocket(url),
      extractMessageData: (event) => event,
      attachRequestId: (data, requestId) => Object.assign({ sequence: requestId }, data),
      extractRequestId: (data) => data && data.sequence,
      packMessage: (data) => JSON.stringify(data),
      unpackMessage: (data) => (data === "pong" ? data : JSON.parse(data)),
    });

    this.wsp.open();

    this.wsp.onOpen.addListener(async () => {
      this.wsIsOpen = true;
      const sequence = Date.now().toString();
      const payload = {
        action: "userOnline",
        apikey: this.apiKey,
        appid: util.appId,
        at: this.aToken,
        nonce: Math.random().toString(36).substr(2, 8),
        sequence,
        ts: Math.floor(Date.now() / 1000),
        userAgent: "app",
        version: 8,
      };

      if (this.debugReqRes) {
        const msg = JSON.stringify(payload, null, 2).replace(this.aToken, "**hidden**").replace(this.apiKey, "**hidden**");
        this.log(`Sending WS login request.\n${msg}`);
      } else if (this.debug) {
        this.log("Sending WS login request.");
      }

      try {
        const res = await this.wsp.sendRequest(payload, { requestId: sequence });
        if (util.hasProperty(res, "config") && res.config.hb && res.config.hbInterval) {
          if (this.hbInterval) clearInterval(this.hbInterval);
          this.hbInterval = setInterval(() => {
            try {
              this.wsp.send("ping");
            } catch (err) {
              if (this.debug) this.log("Error sending ping: %s", err.message);
            }
          }, (res.config.hbInterval + 7) * 1000);
        } else {
          throw new Error(`Unknown parameters received\n${JSON.stringify(res, null, 2)}`);
        }
      } catch (err) {
        this.log.error(`WS login failed [${this.debug ? err : err.message}].`);
      }
    });

    this._setupListeners();
  }

  _setupListeners() {
    this.wsp.onUnpackedMessage.addListener((device) => {
      if (device === "pong") return;

      let onlineStatus = true;
      if (!util.hasProperty(device, "params")) device.params = {};
      if (util.hasProperty(device, "deviceid") && util.hasProperty(device, "error")) {
        device.action = "update";
        onlineStatus = device.error === 0;
        if (device.error !== 0 && this.debug) {
          this.log(`WS message received.\n${JSON.stringify(device, null, 2).replace(this.apiKey, "**hidden**")}`);
        }
      }

      if (util.hasProperty(device, "action")) {
        this._handleAction(device, onlineStatus);
      } else if (util.hasProperty(device, "error") && device.error === 0) {
        // Safe to ignore these messages
      } else {
        if (this.debug) this.log(`WS unknown command received.\n${JSON.stringify(device, null, 2)}`);
      }
    });

    this.wsp.onClose.addListener(async (e) => {
      this._handleConnectionClose(e);
    });

    this.wsp.onError.addListener(async (e) => {
      this._handleConnectionError(e);
    });
  }

  _handleAction(device, onlineStatus) {
    switch (device.action) {
      case "update":
      case "sysmsg":
        if (device.action === "sysmsg" && util.hasProperty(device.params, "online")) {
          onlineStatus = device.params.online;
        }
        this._filterParams(device.params);
        device.params.online = onlineStatus;
        device.params.updateSource = "WS";
        if (Object.keys(device.params).length > 0) {
          const returnTemplate = {
            deviceid: device.deviceid,
            params: device.params,
          };
          if (this.debugReqRes) {
            const msg = JSON.stringify(returnTemplate, null, 2).replace(device.deviceid, "**hidden**");
            this.log(`WS message received.\n${msg}`);
          } else if (this.debug) {
            this.log("WS message received.");
          }
          this.emitter.emit("update", returnTemplate);
        }
        break;

      case "reportSubDevice":
        // Handle specific sub-device reports if necessary
        break;

      default:
        if (this.debug) {
          this.log(`WS message has unknown action.\n${JSON.stringify(device, null, 2)}`);
        }
    }
  }

  _filterParams(params) {
    for (const param in params) {
      if (util.hasProperty(params, param)) {
        if (!util.paramsToKeep.includes(param.replace(/[0-9]/g, ""))) {
          delete params[param];
        }
      }
    }
  }

  async _handleConnectionClose(e) {
    this.wsIsOpen = false;
    if (this.hbInterval) {
      clearInterval(this.hbInterval);
      this.hbInterval = null;
    }
    this.wsp.removeAllListeners();
    if (e === 1005) return;

    if (this.debug) {
      this.log(`Web socket closed - [${e}].`);
      this.log("Web socket will try to reconnect in five seconds.");
    }
    await util.sleep(5000);
    await this.login();
  }

  async _handleConnectionError(e) {
    this.wsIsOpen = false;
    if (this.hbInterval) {
      clearInterval(this.hbInterval);
      this.hbInterval = null;
    }
    this.wsp.removeAllListeners();
    if (this.debug) {
      this.log(`Web socket error - [${e}].`);
      this.log("Web socket will try to reconnect in five seconds.");
    }
    await util.sleep(5000);
    await this.login();
  }

  async sendUpdate(json) {
    const sequence = Date.now().toString();
    const jsonToSend = {
      ...json,
      action: "update",
      sequence,
      ts: 0,
      userAgent: "app",
    };

    if (this.wsp && this.wsIsOpen) {
      try {
        if (this.debugReqRes) {
          const msg = JSON.stringify(jsonToSend, null, 2)
            .replace(json.apikey, "**hidden**")
            .replace(json.apiKey, "**hidden**")
            .replace(json.deviceid, "**hidden**");
          this.log(`WS message sent.\n${msg}`);
        } else if (this.debug) {
          this.log("WS message sent.");
        }

        const device = await this.wsp.sendRequest(jsonToSend, { requestId: sequence });
        device.error = util.hasProperty(device, "error") ? device.error : 504;

        if (device.error !== 0) {
          throw new Error("Unknown response");
        }
      } catch (err) {
        const msg = this.debug ? err : err.message;
        throw new Error(`Device update failed as ${msg}`);
      }
    } else {
      if (this.debug) this.log("Command will be resent when WS is reconnected.");
      await util.sleep(30000);
      return this.sendUpdate(json);
    }
  }

  async requestUpdate(device) {
    const sequence = Date.now().toString();
    const json = {
      action: "query",
      apikey: device.apikey,
      deviceid: device.deviceid,
      params: [],
      sequence,
      ts: 0,
      userAgent: "app",
    };

    if (this.wsp && this.wsIsOpen) {
      this.wsp.send(JSON.stringify(json));
      if (this.debugReqRes) {
        const msg = JSON.stringify(json, null, 2)
          .replace(json.apiKey, "**hidden**")
          .replace(json.deviceid, "**hidden**");
        this.log(`WS message sent.\n${msg}`);
      } else if (this.debug) {
        this.log("WS message sent.");
      }
    } else {
      if (this.debug) this.log("Command will be resent when WS is reconnected.");
      await util.sleep(30000);
      return this.requestUpdate(device);
    }
  }

  receiveUpdate(f) {
    this.emitter.addListener("update", f);
  }

  async closeConnection() {
    if (this.wsp && this.wsIsOpen) {
      await this.wsp.close();
      if (this.debug) this.log("Web socket gracefully closed.");
    }
  }
};
