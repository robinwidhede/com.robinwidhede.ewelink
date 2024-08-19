"use strict";

const { Device } = require('homey');

class ABC20LED extends Device {
  async onInit() {
    this.log('ABC 2.0 LED initialized');
    this.handleStateChange = this.handleStateChange.bind(this);

    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);

    this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
    this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
    this.registerCapabilityListener('light_hue', this.onCapabilityLightHue.bind(this));
    this.registerCapabilityListener('RGBEffects', this.onCapabilityRGBEffects.bind(this));
  }

  handleStateChange(device) {
    if (device.params) {
      if (device.params.switch === 'on') this.setCapabilityValue('onoff', true);
      if (device.params.switch === 'off') this.setCapabilityValue('onoff', false);
      if (device.params.updateSource) this.setStoreValue('api', device.params.updateSource.toLowerCase());
      if (device.params.bright) this.setCapabilityValue('dim', device.params.bright / 100);
      if (device.params.colorR && device.params.colorG && device.params.colorB) {
        const hsbc = this.rgb2hsb([device.params.colorR, device.params.colorG, device.params.colorB]);
        const hue = hsbc[0] / 359;
        this.setCapabilityValue('light_hue', hue);
      }
      if (device.params.mode) this.setCapabilityValue('RGBEffects', device.params.mode.toString());

      if (device.params.startup) this.setSettings({ powerResponse: device.params.startup });
      if (device.params.sledOnline) this.setSettings({ networkLed: device.params.sledOnline });
      if (device.params.pulse) this.setSettings({ duration: device.params.pulse });
      if (device.params.pulseWidth) this.setSettings({ durationLimit: parseFloat(device.params.pulseWidth / 1000) });
    }
  }

  rgb2hsb(rgb) {
    // Your existing rgb2hsb implementation
  }

  hsb2rgb(hsb) {
    // Your existing hsb2rgb implementation
  }

  async onCapabilityOnOff(value) {
    const data = this.createUpdateData();
    await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: value ? 'on' : 'off' });
  }

  async onCapabilityDim(value) {
    const data = this.createUpdateData();
    await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { bright: value * 100 });
  }

  async onCapabilityLightHue(value) {
    const data = this.createUpdateData();
    const rgb = this.hsb2rgb([value * 359, 1, 1]);
    await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: 'on', mode: 1, colorR: rgb[0], colorG: rgb[1], colorB: rgb[2] });
  }

  async onCapabilityRGBEffects(value) {
    const data = this.createUpdateData();
    await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: 'on', mode: parseInt(value) });
  }

  createUpdateData() {
    const { deviceid, apikey, uiid } = this.getData();
    return { name: this.getName(), deviceid, apikey, uiid, api: 'ws' };
  }

  onDeleted() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
    this.log('Device deleted');
  }
}

module.exports = ABC20LED;
