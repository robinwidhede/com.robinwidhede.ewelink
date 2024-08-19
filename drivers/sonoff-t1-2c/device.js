"use strict";

const { Device } = require('homey');

class SonoffT12C extends Device {
  async onInit() {
    this.log(`[T1 2C] [${this.getData().deviceid}] [${this.getName()}] has been inited`);

    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggle("onoff");
    this.registerToggle("onoff.1");
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switches[0].switch === "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switches[0].switch === "off") this.updateCapabilityValue("onoff", false);
      if (device.params.switches[1].switch === "on") this.updateCapabilityValue("onoff.1", true);
      if (device.params.switches[1].switch === "off") this.updateCapabilityValue("onoff.1", false);

      if (device.params.updateSource === "LAN") this.setStoreValue("api", "lan");
      if (device.params.updateSource === "WS") this.setStoreValue("api", "ws");

      this.updateSettingsFromParams(device.params);
    }
  }

  updateSettingsFromParams(params) {
    const settings = {};

    if (params.startup) {
      settings.powerResponse = params.startup;
    }
    if (params.sledOnline) {
      settings.networkLed = params.sledOnline;
    }
    if (params.pulse) {
      settings.duration = params.pulse;
    }
    if (params.pulseWidth) {
      settings.durationLimit = parseFloat(params.pulseWidth / 1000);
    }

    if (Object.keys(settings).length > 0) {
      this.setSettings(settings).catch(this.error);
    }
  }

  async updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
      } catch (error) {
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated because of an error: ${error.message}`);
      }
    }
  }

  registerToggle(name) {
    const data = {
      name: this.getName(),
      deviceid: this.getData().deviceid,
      apikey: this.getData().apikey,
      uiid: this.getData().uiid,
      api: "ws",
    };

    this.registerCapabilityListener(name, async (value) => {
      const channels = [
        { outlet: 0, switch: name === "onoff" ? (value ? "on" : "off") : this.getCapabilityValue("onoff") ? "on" : "off" },
        { outlet: 1, switch: name === "onoff.1" ? (value ? "on" : "off") : this.getCapabilityValue("onoff.1") ? "on" : "off" },
      ];

      await Homey.app.ewelinkApi.sendDeviceUpdate(data, channels);
    });
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = SonoffT12C;
