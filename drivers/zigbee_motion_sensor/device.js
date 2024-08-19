"use strict";

const { Device } = require('homey');

class ZigbeeMotionSensor extends Device {

  async onInit() {
    this.log("Zigbee Motion Sensor device has been initialized");
    this.handleStateChange = this.handleStateChange.bind(this);
    this.registerStateChangeListener();
  }

  handleStateChange(device) {
    if (device.params) {
      if (device.params.battery) {
        const batteryLevel = parseInt(device.params.battery);
        this.updateCapabilityValue("measure_battery", batteryLevel);
        this.updateCapabilityValue("alarm_battery", batteryLevel <= 20);
      }
      if (device.params.motion !== undefined) {
        this.updateCapabilityValue("alarm_motion", device.params.motion === 1);
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
    Homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = ZigbeeMotionSensor;
