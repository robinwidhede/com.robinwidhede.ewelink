"use strict";

const { Device } = require('homey');

class SonoffS20 extends Device {
  async onInit() {
    this.log(`${this.getName()} has been initialized`);

    // Bind methods
    this.handleStateChange = this.handleStateChange.bind(this);

    // Register capabilities and state change listener
    this.registerCapabilities();
    this.registerStateChangeListener();
  }

  registerCapabilities() {
    this.registerCapabilityListener('onoff', async (value) => {
      const data = {
        name: this.getName(),
        deviceid: this.getData().deviceid,
        apikey: this.getData().apikey,
        uiid: this.getData().uiid,
        api: "ws",
      };
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? "on" : "off" });
    });
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      this.updateCapabilityValue('onoff', device.params.switch === 'on');

      if (device.params.updateSource === 'LAN') this.setStoreValue('api', 'lan');
      if (device.params.updateSource === 'WS') this.setStoreValue('api', 'ws');

      if (device.params.startup) {
        this.setSettings({ powerResponse: device.params.startup }).catch(this.error);
      }

      if (device.params.sledOnline) {
        this.setSettings({ networkLed: device.params.sledOnline }).catch(this.error);
      }

      if (device.params.pulse) {
        this.setSettings({ duration: device.params.pulse }).catch(this.error);
      }

      if (device.params.pulseWidth) {
        this.setSettings({ durationLimit: parseFloat(device.params.pulseWidth / 1000) }).catch(this.error);
      }
    }
  }

  async updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
      } catch (error) {
        this.error(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated because of error: ${error.message}`);
      }
    }
  }

  registerStateChangeListener() {
    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = SonoffS20;
