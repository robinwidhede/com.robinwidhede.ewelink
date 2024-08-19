"use strict";

const { Device } = require('homey');

class SonoffSC extends Device {
  async onInit() {
    this.log(`[Sonoff SC] [${this.getData().deviceid}] [${this.getName()}] has been initialized`);
    
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
  }

  async handleStateChange(device) {
    if (device.params) {
      if (device.params.online) {
        await this.setAvailable();
      } else {
        await this.setUnavailable();
      }

      if (device.params.dusty !== undefined) {
        await this.updateCapabilityValue("measure_pm25", parseInt(device.params.dusty));
      }
      if (device.params.noise !== undefined) {
        await this.updateCapabilityValue("measure_noise", parseInt(device.params.noise));
      }
      if (device.params.light !== undefined) {
        await this.updateCapabilityValue("measure_luminance", parseInt(device.params.light));
      }
      if (device.params.temperature !== undefined) {
        await this.updateCapabilityValue("measure_temperature", parseFloat(device.params.temperature));
      }
      if (device.params.humidity !== undefined) {
        await this.updateCapabilityValue("measure_humidity", parseFloat(device.params.humidity));
      }
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

module.exports = SonoffSC;
