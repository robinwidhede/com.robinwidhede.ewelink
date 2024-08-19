"use strict";

const { Device } = require('homey');

class CoolkitSocket extends Device {

  async onInit() {
    this.log(`${this.getName()} has been initialized`);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
    this.registerCapabilities();
  }

  registerCapabilities() {
    this.registerToggleCapability("onoff");
    this.registerMeasureCapability("measure_voltage", "voltage");
    this.registerMeasureCapability("measure_power", "power");
    this.registerMeasureCapability("meter_power", "current");
  }

  registerToggleCapability(capabilityName) {
    this.registerCapabilityListener(capabilityName, async (value) => {
      try {
        await this.homey.app.ewelinkApi.sendDeviceUpdate(this.getDeviceData(), { switch: value ? "on" : "off" });
      } catch (error) {
        this.error(`Failed to update ${capabilityName}:`, error);
      }
    });
  }

  registerMeasureCapability(capabilityName, paramName) {
    this.registerCapabilityListener(capabilityName, async () => {
      try {
        const device = await this.homey.app.ewelinkApi.getDevice(this.getData().deviceid);
        const value = parseFloat(device.params[paramName]);
        if (!isNaN(value)) {
          await this.setCapabilityValue(capabilityName, value);
          this.log(`[${this.getName()}] [${capabilityName}] updated to ${value}`);
        }
      } catch (error) {
        this.error(`Failed to update ${capabilityName}:`, error);
      }
    });
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      this.updateCapabilityValue("onoff", device.params.switch === "on");
      this.updateCapabilityValue("measure_voltage", parseFloat(device.params.voltage));
      this.updateCapabilityValue("measure_power", parseFloat(device.params.power));
      this.updateCapabilityValue("meter_power", parseFloat(device.params.current));

      if (device.params.updateSource) {
        this.setStoreValue("api", device.params.updateSource.toLowerCase());
      }

      const settings = {};
      if (device.params.startup) settings.powerResponse = device.params.startup;
      if (device.params.sledOnline) settings.networkLed = device.params.sledOnline;
      if (device.params.pulse) settings.duration = device.params.pulse;
      if (device.params.pulseWidth) settings.durationLimit = parseFloat(device.params.pulseWidth / 1000);
      this.setSettings(settings).catch(this.error);
    }
  }

  async updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getName()}] [${name}] updated to ${value}`);
      } catch (error) {
        this.error(`Failed to update ${name}:`, error);
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
    this.log(`${this.getName()} has been deleted`);
  }
}

module.exports = CoolkitSocket;
