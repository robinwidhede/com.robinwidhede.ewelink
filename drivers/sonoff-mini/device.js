"use strict";

const { Device } = require('homey');

class SonoffMini extends Device {
  async onInit() {
    this.log('Sonoff Mini has been initialized');
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value) {
    try {
      const data = {
        name: this.getName(),
        deviceid: this.getData().deviceid,
        apikey: this.getData().apikey,
        uiid: this.getData().uiid,
        api: this.getStoreValue('api') || 'ws',
      };
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? 'on' : 'off' });
    } catch (error) {
      this.log('Failed to send onoff command:', error);
    }
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switch === 'on') {
        this.updateCapabilityValue('onoff', true);
      } else if (device.params.switch === 'off') {
        this.updateCapabilityValue('onoff', false);
      }

      if (device.params.updateSource) {
        this.setStoreValue('api', device.params.updateSource.toLowerCase());
      }

      const settings = {};
      if (device.params.startup) settings.powerResponse = device.params.startup;
      if (device.params.sledOnline) settings.networkLed = device.params.sledOnline;
      if (device.params.pulse) settings.duration = device.params.pulse;
      if (device.params.pulseWidth) settings.durationLimit = parseFloat(device.params.pulseWidth / 1000);

      if (Object.keys(settings).length > 0) {
        this.setSettings(settings).catch((error) => {
          this.log('Failed to update settings:', error.message);
        });
      }
    }
  }

  async updateCapabilityValue(name, value) {
    try {
      if (this.getCapabilityValue(name) !== value) {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
      }
    } catch (error) {
      this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability not updated due to error:`, error.message);
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
    this.log('Device deleted');
  }
}

module.exports = SonoffMini;
