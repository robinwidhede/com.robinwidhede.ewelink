/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
"use strict";
const axios = require("axios");
const crypto = require("crypto");
const util = require("./util");

module.exports = class eWeLinkHTTP {
  constructor(config, log) {
    this.log = log;
    this.debug = config.debug || false;
    this.debugReqRes = config.debugReqRes || false;
    this.username = config.username.toString();
    this.password = config.password.toString();
    this.hideDevFromHB = (config.hideDevFromHB || "").toString();
    this.cCode = `+${config.countryCode.toString().replace("+", "").replace(" ", "")}`;
  }

  async getHost() {
    const params = {
      appid: util.appId,
      country_code: this.cCode,
      nonce: Math.random().toString(36).substr(2, 8),
      ts: Math.floor(Date.now() / 1000),
      version: 8,
    };

    let dataToSign = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .sort()
      .join("&");

    dataToSign = crypto.createHmac("sha256", util.appSecret).update(dataToSign).digest("base64");

    if (this.debugReqRes) {
      this.log(`Sending HTTP getHost() request. Data: ${JSON.stringify(params, null, 2)}`);
    } else if (this.debug) {
      this.log("Sending HTTP getHost() request.");
    }

    try {
      const res = await axios.get("https://api.coolkit.cc:8080/api/user/region", {
        headers: {
          Authorization: `Sign ${dataToSign}`,
          "Content-Type": "application/json",
        },
        params,
      });

      const body = res.data;

      if (!body.region) {
        throw new Error(`Server did not respond with a region.\n${JSON.stringify(body, null, 2)}`);
      }

      switch (body.region) {
        case "eu":
        case "us":
        case "as":
          this.httpHost = `${body.region}-apia.coolkit.cc`;
          break;
        case "cn":
          this.httpHost = "cn-apia.coolkit.cn";
          break;
        default:
          throw new Error(`No valid region received - [${body.region}].`);
      }

      if (this.debug) this.log(`HTTP API host received [${this.httpHost}].`);

    } catch (err) {
      if (err.code && util.httpRetryCodes.includes(err.code)) {
        if (this.debug) this.log("Unable to reach eWeLink. Retrying in 30 seconds.");
        await util.sleep(30000);
        return await this.getHost();
      } else {
        throw err;
      }
    }
  }

  async login() {
    if (!this.httpHost) this.httpHost = "eu-apia.coolkit.cc";

    const data = {
      countryCode: this.cCode,
      password: this.password,
      ...(this.username.includes("@") ? { email: this.username } : { phoneNumber: this.username }),
    };

    if (this.debugReqRes) {
      const msg = JSON.stringify(data, null, 2).replace(this.password, "**hidden**").replace(this.username, "**hidden**");
      this.log(`Sending HTTP login() request. Data: ${msg}`);
    } else if (this.debug) {
      this.log("Sending HTTP login() request.");
    }

    const dataToSign = crypto.createHmac("sha256", util.appSecret).update(JSON.stringify(data)).digest("base64");

    try {
      const res = await axios.post(`https://${this.httpHost}/v2/user/login`, data, {
        headers: {
          Authorization: `Sign ${dataToSign}`,
          "Content-Type": "application/json",
          "X-CK-Appid": util.appId,
          "X-CK-Nonce": Math.random().toString(36).substr(2, 8),
        },
      });

      const body = res.data;

      if (body.error === 10004 && body.data && body.data.region) {
        const givenRegion = body.data.region;
        this.httpHost = givenRegion === "cn" ? "cn-apia.coolkit.cn" : `${givenRegion}-apia.coolkit.cc`;

        if (this.debug) this.log(`New HTTP API host received [${this.httpHost}].`);
        return await this.login();
      }

      if (body.data && body.data.at) {
        this.aToken = body.data.at;
        this.apiKey = body.data.user.apikey;
        return {
          aToken: this.aToken,
          apiKey: this.apiKey,
          httpHost: this.httpHost,
        };
      } else {
        if (body.error === 500) {
          if (this.debug) this.log("An eWeLink error [500] occurred. Retrying in 30 seconds.");
          await util.sleep(30000);
          return await this.login();
        } else {
          throw new Error(`No auth token received.\n${JSON.stringify(body, null, 2)}`);
        }
      }

    } catch (err) {
      if (err.code && util.httpRetryCodes.includes(err.code)) {
        if (this.debug) this.log("Unable to reach eWeLink. Retrying in 30 seconds.");
        await util.sleep(30000);
        return await this.login();
      } else {
        throw err;
      }
    }
  }

  async getDevices() {
    try {
      const res = await axios.get(`https://${this.httpHost}/v2/device/thing`, {
        headers: {
          Authorization: `Bearer ${this.aToken}`,
          "Content-Type": "application/json",
          "X-CK-Appid": util.appId,
          "X-CK-Nonce": Math.random().toString(36).substr(2, 8),
        },
      });

      const body = res.data;

      if (!body.data || body.error !== 0) {
        throw new Error(JSON.stringify(body, null, 2));
      }

      const deviceList = [];
      const sensorList = [];

      if (body.data.thingList && body.data.thingList.length > 0) {
        body.data.thingList.forEach(d => {
          if (d.itemData && d.itemData.extra && d.itemData.extra.uiid && !this.hideDevFromHB.includes(d.itemData.deviceid)) {
            if (d.itemData.extra.uiid === 102) {
              sensorList.push(d.itemData);
            } else {
              deviceList.push(d.itemData);
            }
          }
        });
      }

      return deviceList.concat(sensorList);

    } catch (err) {
      if (err.code && util.httpRetryCodes.includes(err.code)) {
        if (this.debug) this.log("Unable to reach eWeLink. Retrying in 30 seconds.");
        await util.sleep(30000);
        return await this.getDevices();
      } else {
        throw err;
      }
    }
  }

  async getDevice(deviceId) {
    try {
      const res = await axios.post(`https://${this.httpHost}/v2/device/thing`, {
        thingList: [{ itemType: 1, id: deviceId }],
      }, {
        headers: {
          Authorization: `Bearer ${this.aToken}`,
          "Content-Type": "application/json",
          "X-CK-Appid": util.appId,
          "X-CK-Nonce": Math.random().toString(36).substr(2, 8),
        },
      });

      const body = res.data;

      if (!body.data || body.error !== 0) {
        throw new Error(JSON.stringify(body, null, 2));
      }

      if (body.data.thingList && body.data.thingList.length === 1) {
        return body.data.thingList[0].itemData;
      } else {
        throw new Error("Device not found in eWeLink");
      }

    } catch (err) {
      if (err.code && util.httpRetryCodes.includes(err.code)) {
        if (this.debug) this.log("Unable to reach eWeLink. Retrying in 30 seconds.");
        await util.sleep(30000);
        return await this.getDevice(deviceId);
      } else {
        throw err;
      }
    }
  }
};
