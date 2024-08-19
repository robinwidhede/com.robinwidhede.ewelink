"use strict";

const { Device } = require('homey');

class SonoffBasic extends Device {
  async onInit() {
    this.log("Sonoff Basic initialized");

    this.saving = false;

    this.registerStateChangeListener();
    this.registerToggleCapability("onoff");

    // Retrieve initial device state
    const deviceData = this.getData();
    this.log(`Device initialized with ID: ${deviceData.deviceid}`);
  }

  registerStateChangeListener() {
    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange.bind(this));
  }

  unregisterStateChangeListener() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange.bind(this));
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      this.updateCapabilityValue("onoff", device.params.switch === "on");

      if (device.params.updateSource) {
        this.setStoreValue("api", device.params.updateSource.toLowerCase());
      }

      this.updateSettings(device.params);
    }
  }

  async updateSettings(params) {
    const settings = {};
    if (params.startup) settings.powerResponse = params.startup;
    if (params.sledOnline) settings.networkLed = params.sledOnline;
    if (params.pulse) settings.duration = params.pulse;
    if (params.pulseWidth) settings.durationLimit = parseFloat(params.pulseWidth / 1000);

    try {
      await this.setSettings(settings);
    } catch (error) {
      this.log('Failed to update settings:', error.message);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const data = {
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
      this.log("Error sending device update:", error.message);
    }
  }

  async updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
      } catch (error) {
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated: ${error.message}`);
      }
    }
  }

  registerToggleCapability(name) {
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
        this.log("Error sending toggle update:", error.message);
      }
    });
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = SonoffBasic;
