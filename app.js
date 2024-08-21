// Updated app.js
"use strict";

const { App } = require("homey");
const eWeLinkHTTP = require("./lib/http");
const eWeLinkLAN = require("./lib/lan");
const eWeLinkWS = require("./lib/ws");

class Ewelink extends App {
  async onInit() {
    this.log("Ewelink is running...");

    this.devicesInHomey = new Map();
    this.devicesInEwelink = new Map();

    // Bind the settings change handler
    this.onSettingsChanged = this.onSettingsChanged.bind(this);
    this.homey.settings.on("set", this.onSettingsChanged);
    this.homey.settings.on("unset", this.onSettingsChanged);

    // Initialize the API clients but don't connect yet
    this.httpClient = null;
    this.wsClient = null;
    this.lanClient = null;
  }

  async connectToEwelink(account) {
    try {
      this.log("Connecting to eWeLink with account:", account);
      const config = {
        username: account.login,
        password: account.password,
        countryCode: account.countryCode,
        debug: false,
      };
      this.httpClient = new eWeLinkHTTP(config, this.log);
      await this.httpClient.getHost();
      this.authData = await this.httpClient.login();

      const deviceList = await this.httpClient.getDevices();
      deviceList.forEach(device => this.devicesInEwelink.set(device.deviceid, device));

      this.wsClient = new eWeLinkWS(config, this.log, this.authData);
      await this.wsClient.getHost();
      this.wsClient.login();

      this.lanClient = new eWeLinkLAN(config, this.log, deviceList);
      await this.lanClient.startMonitor();

      this.log("API successfully started");
    } catch (error) {
      this.log("Error during eWeLink connection:", error);
    }
  }

  async onSettingsChanged(key) {
    if (key === "account") {
      const account = this.homey.settings.get("account");
      if (account) {
        await this.connectToEwelink(account);
      }
    }
  }
}

module.exports = Ewelink;
