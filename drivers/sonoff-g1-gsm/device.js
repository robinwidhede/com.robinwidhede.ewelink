"use strict";

const { Device } = require('homey');

class SonoffG1GSM extends Device {
  async onInit() {
    this.log("Sonoff G1 GSM device has been initialized");
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
      api: 'ws',
    };

    try {
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? 'on' : 'off' });
    } catch (error) {
      this.log(`Error setting onoff capability: ${error.message}`);
    }
  }

  handleStateChange(device) {
    if (device.params) {
      if (device.params.online) {
        this.setAvailable();
      } else {
        this.setUnavailable();
      }

      this.updateCapabilityValue('onoff', device.params.switch === 'on');
      
      if (device.params.updateSource) {
        this.setStoreValue('api', device.params.updateSource.toLowerCase());
      }

      const settings = {
        powerResponse: device.params.startup,
        networkLed: device.params.sledOnline,
        duration: device.params.pulse,
        durationLimit: parseFloat(device.params.pulseWidth / 1000),
      };

      this.setSettings(settings).catch(this.error);
    }
  }

  async updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
      } catch (error) {
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated due to error: ${error.message}`);
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

module.exports = SonoffG1GSM;
