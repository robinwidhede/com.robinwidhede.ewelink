"use strict";

const { Device } = require('homey');

class Generic extends Device {

  async onInit() {
    this.log('Generic device has been initialized');
    this.handleStateChange = this.handleStateChange.bind(this);

    // Register listeners
    this.registerStateChangeListener();
    this.registerToggle('onoff');
  }

  handleStateChange(device) {
    if (device.params) {
      // Set device availability based on online status
      device.params.online ? this.setAvailable() : this.setUnavailable();

      // Update capabilities based on device parameters
      if (device.params.switch === "on") this.updateCapabilityValue("onoff", true);
      if (device.params.switch === "off") this.updateCapabilityValue("onoff", false);

      // Store API source
      if (device.params.updateSource === "LAN") this.setStoreValue("api", "lan");
      if (device.params.updateSource === "WS") this.setStoreValue("api", "ws");

      // Update settings
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
      settings.durationLimit = parseFloat(params.pulseWidth) / 1000;
    }

    if (Object.keys(settings).length > 0) {
      this.setSettings(settings).catch(this.error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let data = {
      name: this.getName(),
      deviceid: this.getData().deviceid,
      apikey: this.getData().apikey,
      uiid: this.getData().uiid,
      api: "ws",
    };

    const updates = {};

    if (changedKeys.includes('powerResponse')) {
      updates.startup = newSettings.powerResponse;
    }

    if (changedKeys.includes('networkLed')) {
      updates.sledOnline = newSettings.networkLed;
    }

    if (changedKeys.includes('duration')) {
      updates.pulse = newSettings.duration;
    }

    if (changedKeys.includes('durationLimit')) {
      updates.pulseWidth = newSettings.durationLimit * 1000;
    }

    try {
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, updates);
    } catch (error) {
      this.error('Failed to send device update', error);
    }
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
        })
        .catch((error) => {
          this.error(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated due to error: ${error.message}`);
        });
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
      try {
        await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? "on" : "off" });
      } catch (error) {
        this.error('Failed to toggle switch', error);
      }
    });
  }

  registerStateChangeListener() {
    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log('Device deleted');
  }
}

module.exports = Generic;
