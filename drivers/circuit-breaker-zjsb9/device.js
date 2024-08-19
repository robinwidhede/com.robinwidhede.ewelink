"use strict";

const { Device } = require('homey');

class CircuitBreaker extends Device {
  async onInit() {
    this.log(`[${this.getModel()}] [${this.getData().deviceid}] [${this.getName()}] has been initialized`);

    // Bind the state change handler
    this.handleStateChange = this.handleStateChange.bind(this);

    // Register capabilities
    this.registerCapabilities();

    // Register state change listener
    this.registerStateChangeListener();
  }

  getModel() {
    return "Sonoff SC";
  }

  registerCapabilities() {
    // Register toggle capabilities
    this.registerToggle("onoff");
    this.registerToggle("onoff.1");
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switch === "on") {
        this.updateCapabilityValue("onoff", true);
      } else if (device.params.switch === "off") {
        this.updateCapabilityValue("onoff", false);
      }

      if (device.params.updateSource === "LAN") {
        this.setStoreValue("api", "lan");
      } else if (device.params.updateSource === "WS") {
        this.setStoreValue("api", "ws");
      }

      if (device.params.startup) {
        this.setSettings({
          powerResponse: device.params.startup,
        }).catch(this.error);
      }

      if (device.params.sledOnline) {
        this.setSettings({
          networkLed: device.params.sledOnline,
        }).catch(this.error);
      }

      if (device.params.pulse) {
        this.setSettings({
          duration: device.params.pulse,
        }).catch(this.error);
      }

      if (device.params.pulseWidth) {
        this.setSettings({
          durationLimit: parseFloat(device.params.pulseWidth / 1000),
        }).catch(this.error);
      }
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
    this.registerCapabilityListener(name, async (value) => {
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
        this.error(`Error sending device update for ${name}:`, error.message);
        throw new Error('Failed to send update');
      }
    });
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

module.exports = CircuitBreaker;
