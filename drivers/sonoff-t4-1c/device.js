"use strict";

const { Device } = require('homey');

class SonoffT41C extends Device {
  async onInit() {
    this.log(`[${this.getName()}] - Device initialized`);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerToggle('onoff');
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      this.updateCapabilityValue('onoff', device.params.switch === 'on');

      if (device.params.updateSource) {
        this.setStoreValue('api', device.params.updateSource.toLowerCase());
      }

      const settings = {};
      if (device.params.startup) settings.powerResponse = device.params.startup;
      if (device.params.sledOnline) settings.networkLed = device.params.sledOnline;
      if (device.params.pulse) settings.duration = device.params.pulse;
      if (device.params.pulseWidth) settings.durationLimit = parseFloat(device.params.pulseWidth / 1000);

      if (Object.keys(settings).length > 0) {
        this.setSettings(settings)
          .then(() => this.log(`[${this.getName()}] - Settings updated`))
          .catch((error) => this.error(`[${this.getName()}] - Failed to update settings: ${error.message}`));
      }
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

    const updates = changedKeys.reduce((obj, key) => {
      if (key in newSettings) {
        obj[key] = newSettings[key];
      }
      return obj;
    }, {});

    try {
      await Homey.app.ewelinkApi.sendDeviceUpdate(data, {
        startup: updates.powerResponse,
        sledOnline: updates.networkLed,
        pulse: updates.duration,
        pulseWidth: updates.durationLimit * 1000,
      });
      this.log(`[${this.getName()}] - Settings successfully sent to device`);
    } catch (error) {
      this.error(`[${this.getName()}] - Failed to send settings to device: ${error.message}`);
    }
  }

  updateCapabilityValue(capability, value) {
    if (this.getCapabilityValue(capability) !== value) {
      this.setCapabilityValue(capability, value)
        .then(() => this.log(`[${this.getName()}] - Capability ${capability} successfully updated to ${value}`))
        .catch((error) => this.error(`[${this.getName()}] - Failed to update capability ${capability}: ${error.message}`));
    }
  }

  registerToggle(capability) {
    this.registerCapabilityListener(capability, async (value) => {
      const data = {
        name: this.getName(),
        deviceid: this.getData().deviceid,
        apikey: this.getData().apikey,
        uiid: this.getData().uiid,
        api: 'ws',
      };

      try {
        await Homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? 'on' : 'off' });
        this.log(`[${this.getName()}] - Toggle ${capability} updated to ${value}`);
      } catch (error) {
        this.error(`[${this.getName()}] - Failed to update toggle ${capability}: ${error.message}`);
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
    this.log(`[${this.getName()}] - Device deleted`);
  }
}

module.exports = SonoffT41C;
