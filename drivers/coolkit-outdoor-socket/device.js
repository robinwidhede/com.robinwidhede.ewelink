"use strict";

const { Device } = require('homey');

class CoolKitOutdoorSocket extends Device {

  async onInit() {
    this.log("Coolkit Outdoor Socket has been initialized");

    this.handleStateChange = this.handleStateChange.bind(this);

    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value) {
    const data = {
      name: this.getName(),
      deviceid: this.getData().deviceid,
      apikey: this.getData().apikey,
      uiid: this.getData().uiid,
      api: "ws",
    };

    try {
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? "on" : "off" });
    } catch (error) {
      this.error("Failed to send onoff command:", error);
      throw new Error(this.homey.__("error.command_failed"));
    }
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      this.updateCapabilityValue("onoff", device.params.switch === "on");

      if (device.params.updateSource) {
        this.setStoreValue("api", device.params.updateSource.toLowerCase());
      }

      this.updateSettings({
        powerResponse: device.params.startup,
        networkLed: device.params.sledOnline,
        duration: device.params.pulse,
        durationLimit: parseFloat(device.params.pulseWidth / 1000),
      });
    }
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
        })
        .catch((error) => {
          this.error(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated:`, error.message);
        });
    }
  }

  updateSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        this.setSettings({ [key]: value })
          .catch((error) => {
            this.error(`Failed to update setting ${key}:`, error.message);
          });
      }
    }
  }

  registerStateChangeListener() {
    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  async onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = CoolKitOutdoorSocket;
