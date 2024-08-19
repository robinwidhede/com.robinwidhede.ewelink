"use strict";

const { Device } = require('homey');

class SonoffTH16 extends Device {
  async onInit() {
    this.log('Sonoff TH16 has been initialized');
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggle('onoff');
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switch === 'on') this.updateCapabilityValue('onoff', true);
      if (device.params.switch === 'off') this.updateCapabilityValue('onoff', false);
      if (device.params.currentTemperature) this.updateCapabilityValue('measure_temperature', parseFloat(device.params.currentTemperature));
      if (device.params.currentHumidity) this.updateCapabilityValue('measure_humidity', parseFloat(device.params.currentHumidity));
      if (device.params.updateSource === 'LAN') this.setStoreValue('api', 'lan');
      if (device.params.updateSource === 'WS') this.setStoreValue('api', 'ws');

      this.updateSettings(device.params);
    }
  }

  updateSettings(params) {
    const settings = {};
    if (params.sensorType) {
      settings.sensorType = params.sensorType;
    }
    if (params.deviceType) {
      settings.thermostatMode = params.deviceType;
      if (params.deviceType === 'temperature') {
        settings.targetHighTemperature = parseFloat(params.targets[0].targetHigh);
        settings.highTemperatureThreshold = params.targets[0].reaction.switch;
        settings.targetLowTemperature = parseFloat(params.targets[1].targetLow);
        settings.lowTemperatureThreshold = params.targets[1].reaction.switch;
      } else if (params.deviceType === 'humidity') {
        settings.targetHighHumidity = parseFloat(params.targets[0].targetHigh);
        settings.highHumidityThreshold = params.targets[0].reaction.switch;
        settings.targetLowHumidity = parseFloat(params.targets[1].targetLow);
        settings.lowHumidityThreshold = params.targets[1].reaction.switch;
      } else {
        settings.thermostatMode = 'off';
      }
    }
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

    if (Object.keys(settings).length) {
      this.setSettings(settings).catch(err => this.error('Failed to update settings', err));
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const data = {
      name: this.getName(),
      deviceid: this.getData().deviceid,
      apikey: this.getData().apikey,
      uiid: this.getData().uiid,
      api: 'ws',
    };

    const updateData = {};

    if (changedKeys.includes('thermostatMode')) {
      updateData.deviceType = newSettings.thermostatMode;
    }

    if (changedKeys.includes('targetHighTemperature')) {
      updateData.targets = [
        { targetHigh: newSettings.targetHighTemperature, reaction: { switch: newSettings.highTemperatureThreshold } },
        { targetLow: newSettings.targetLowTemperature, reaction: { switch: newSettings.lowTemperatureThreshold } },
      ];
    }

    // Additional settings handling as needed...

    try {
      await Homey.app.ewelinkApi.sendDeviceUpdate(data, updateData);
      this.log('Settings updated successfully');
    } catch (error) {
      this.error('Failed to update device settings', error);
    }
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log(`[${this.getData().deviceid}] [${name}] [${value}] Capability successfully updated`);
        })
        .catch(error => {
          this.error(`[${this.getData().deviceid}] [${name}] [${value}] Capability update failed:`, error.message);
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
        api: 'ws',
      };
      try {
        await Homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? 'on' : 'off' });
      } catch (error) {
        this.error(`Failed to toggle ${name}`, error);
      }
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
    this.log('Device deleted');
  }
}

module.exports = SonoffTH16;
