/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
"use strict";

const axios = require("axios");
const crypto = require("crypto");
const dns = require("node-dns-sd");
const EventEmitter = require("events");
const util = require("./util");

module.exports = class eWeLinkLAN {
  constructor(config, log, devices) {
    this.log = log;
    this.config = config;
    this.debug = config.debug || false;
    this.debugReqRes = config.debugReqRes || false;
    this.emitter = new EventEmitter();
    this.deviceMap = new Map();

    devices.forEach((device) => {
      this.deviceMap.set(device.deviceid, {
        apiKey: device.devicekey,
        online: util.hasProperty(config.ipOverride, device.deviceid),
        ip: util.hasProperty(config.ipOverride, device.deviceid) ? config.ipOverride[device.deviceid] : null,
        lastIV: null,
      });
    });
  }

  async getHosts() {
    try {
      const res = await dns.discover({ name: "_ewelink._tcp.local" });

      res.forEach((device) => {
        const deviceId = device.fqdn.replace("._ewelink._tcp.local", "").replace("eWeLink_", "");
        const existingDevice = this.deviceMap.get(deviceId);

        if (existingDevice && !util.hasProperty(this.config.ipOverride, deviceId)) {
          this.deviceMap.set(deviceId, {
            apiKey: existingDevice.apiKey,
            online: true,
            ip: device.address,
            lastIV: null,
          });
        }
      });

      return this.deviceMap;
    } catch (error) {
      this.log(`Failed to discover hosts: ${error.message}`);
      throw error;
    }
  }

  async startMonitor() {
    dns.ondata = (packet) => {
      if (packet.answers) {
        packet.answers
          .filter((answer) => answer.name.includes("_ewelink._tcp.local"))
          .filter((answer) => answer.type === "TXT")
          .filter((answer) => this.deviceMap.has(answer.rdata.id))
          .forEach((answer) => {
            const rdata = answer.rdata;
            const deviceInfo = this.deviceMap.get(rdata.id);

            if (deviceInfo.lastIV === rdata.iv) return;

            deviceInfo.lastIV = rdata.iv;

            const dataParts = [
              rdata.data1,
              rdata.data2 || "",
              rdata.data3 || "",
              rdata.data4 || ""
            ];
            const data = dataParts.join("");

            const key = crypto.createHash("md5").update(Buffer.from(deviceInfo.apiKey, "utf8")).digest();
            const decipher = crypto.createDecipheriv("aes-128-cbc", key, Buffer.from(rdata.iv, "base64"));
            const decrypted = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");

            let params;

            if (packet.address !== deviceInfo.ip && !util.hasProperty(this.config.ipOverride, rdata.id)) {
              this.deviceMap.set(rdata.id, {
                apiKey: deviceInfo.apiKey,
                online: true,
                ip: packet.address,
                lastIV: rdata.iv,
              });
              if (this.debug) this.log(`[${rdata.id}] Updating IP address to [${packet.address}].`);
            }

            try {
              params = JSON.parse(decrypted);
            } catch (e) {
              if (this.debug) this.log(`[${rdata.id}] Error parsing LAN message: ${e.message}`);
              return;
            }

            for (const param in params) {
              if (util.hasProperty(params, param) && !util.paramsToKeep.includes(param.replace(/[0-9]/g, ""))) {
                delete params[param];
              }
            }

            if (Object.keys(params).length > 0) {
              params.updateSource = "LAN";
              params.online = true;

              const returnTemplate = {
                deviceid: rdata.id,
                params,
              };

              if (this.debugReqRes) {
                const msg = JSON.stringify(returnTemplate, null, 2).replace(rdata.id, "**hidden**");
                this.log(`LAN message received: ${msg}`);
              } else if (this.debug) {
                this.log("LAN message received.");
              }

              this.emitter.emit("update", returnTemplate);
            }
          });
      }
    };

    dns.startMonitoring();
  }

  async sendUpdate(json) {
    try {
      const deviceInfo = this.deviceMap.get(json.deviceid);

      if (!deviceInfo.online) {
        throw new Error("Device isn't reachable via LAN mode");
      }

      const { apiKey } = deviceInfo;
      const params = {};
      let suffix;

      if (util.hasProperty(json.params, "switches")) {
        params.switches = json.params.switches;
        suffix = "switches";
      } else if (util.hasProperty(json.params, "switch")) {
        params.switch = json.params.switch;
        suffix = "switch";
      } else {
        throw new Error("Device isn't configurable via LAN mode");
      }

      if (apiKey) {
        const key = crypto.createHash("md5").update(Buffer.from(apiKey, "utf8")).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

        const data = {
          data: Buffer.concat([cipher.update(JSON.stringify(params)), cipher.final()]).toString("base64"),
          deviceid: json.deviceid,
          encrypt: true,
          iv: iv.toString("base64"),
          selfApikey: "123",
          sequence: Date.now().toString(),
        };

        if (this.debugReqRes) {
          const msg = JSON.stringify(json, null, 2).replace(json.apikey, "**hidden**").replace(json.deviceid, "**hidden**");
          this.log(`LAN message sent: ${msg}`);
        } else if (this.debug) {
          this.log("LAN message sent.");
        }

        const res = await axios.post(`http://${deviceInfo.ip}:8081/zeroconf/${suffix}`, data, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!util.hasProperty(res.data, "error") || res.data.error !== 0) {
          throw new Error(res.data);
        }

        return "ok";
      }
    } catch (err) {
      this.log(`Failed to send update: ${err.message}`);
      return err.message;
    }
  }

  receiveUpdate(callback) {
    this.emitter.addListener("update", callback);
  }

  addDeviceToMap(device) {
    this.deviceMap.set(device.deviceid, {
      apiKey: device.devicekey,
      online: util.hasProperty(this.config.ipOverride, device.deviceid),
      ip: util.hasProperty(this.config.ipOverride, device.deviceid) ? this.config.ipOverride[device.deviceid] : null,
      lastIV: null,
    });
  }

  async closeConnection() {
    await dns.stopMonitoring();
    if (this.debug) this.log("LAN monitoring gracefully stopped.");
  }
};
