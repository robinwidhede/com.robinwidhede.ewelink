"use strict";

const { Device } = require('homey');

class SonoffPow extends Device {
  async onInit() {
    this.log('Sonoff Pow has been initialized');
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggle('onoff');
  }

  handleStateChange(device) {
    if (device.params) {
      if (device.params.online) {
        this.setAvailable();
      } else {
        this.setUnavailable();
      }

      this.updateCapabilityValue('onoff', device.params.switch === 'on');
      this.updateCapabilityValue('measure_power', parseFloat(device.params.power));
      this.updateCapabilityValue('measure_voltage', parseFloat(device.params.voltage));
      this.updateCapabilityValue('meter_power', parseFloat(device.params.current));

      if (device.params.updateSource) {
        this.setStoreValue('api', device.params.updateSource.toLowerCase());
      }

      this.updateDeviceSettings(device.params);
    }
  }

  updateDeviceSettings(params) {
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

    this.setSettings(settings).catch(err => {
      this.log('Error setting device settings:', err.message);
    });
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

  registerToggle(name) {
    this.registerCapabilityListener(name, async value => {
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
        this.log('Error sending toggle update:', error.message);
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

module.exports = SonoffPow;
