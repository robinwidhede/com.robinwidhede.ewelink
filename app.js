"use strict";

const { App } = require("homey");
const EwelinkApi = require("./lib/index");

class Ewelink extends App {
  async onInit() {
    this.log("Ewelink is running...");

    // Initialize eWeLink API
    this.ewelinkApi = new EwelinkApi(this.log);

    // Bind the settings change handler
    this.onSettingsChanged = this.onSettingsChanged.bind(this);

    // Listen to changes in the settings
    if (this.homey.settings) {
      this.homey.settings.on("set", this.onSettingsChanged);
      this.homey.settings.on("unset", this.onSettingsChanged);
    } else {
      this.log("Error: Homey settings object is not initialized properly.");
    }

    // Handle initial connection
    const account = this.homey.settings && typeof this.homey.settings.get === 'function' ? this.homey.settings.get('account') : null;
    if (account) {
      try {
        await this.ewelinkApi.connect(account);
      } catch (error) {
        this.log("Failed to connect to eWeLink API:", error);
      }
    } else {
      this.log("No account information found or Homey settings get method is undefined.");
    }
  }

  async onSettingsChanged(key) {
    if (!this.homey.settings || typeof this.homey.settings.get !== 'function') {
      this.log("Error: Homey settings object is not initialized properly.");
      return;
    }

    switch (key) {
      case "account":
        // Handle account changes
        const account = this.homey.settings.get('account');
        try {
          await this.ewelinkApi.eWeLinkShutdown();
          if (account) {
            await this.ewelinkApi.connect(account);
          }
        } catch (error) {
          this.log("Failed to handle account changes:", error);
        }
        break;
      default:
        break;
    }
  }

  sign(signData) {
    return this.ewelinkApi.sign(signData);
  }

  getDevices(signData) {
    return this.ewelinkApi.getAllDevices(signData);
  }
}

module.exports = Ewelink;
