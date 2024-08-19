"use strict";

const Homey = require("homey");

class ZigbeeTemperatureHumiditySensor extends Homey.Device {
  async onInit() {
    this.log("Zigbee Temperature Humidity Sensor device has been initialized");

    // Bind the state change handler to ensure proper context
    this.handleStateChange = this.handleStateChange.bind(this);

    // Register the state change listener to handle updates
    this.registerStateChangeListener();

    // Log the initialization details
    this.log(`[${this.getName()}] initialized with ID: ${this.getData().deviceid}`);
  }

  // Handle the device state changes and update the capability values accordingly
  handleStateChange(device) {
    if (device.params) {
      // Update battery measurement and battery alarm
      if (device.params.battery !== undefined) {
        const batteryValue = parseInt(device.params.battery);
        this.updateCapabilityValue("measure_battery", batteryValue);
        this.updateCapabilityValue("alarm_battery", batteryValue <= 20);
      }

      // Update temperature measurement
      if (device.params.temperature !== undefined) {
        const temperatureValue = parseInt(device.params.temperature) / 100;
        this.updateCapabilityValue("measure_temperature", temperatureValue);
      }

      // Update humidity measurement
      if (device.params.humidity !== undefined) {
        const humidityValue = parseInt(device.params.humidity) / 100;
        this.updateCapabilityValue("measure_humidity", humidityValue);
      }
    }
  }

  // Function to safely update the capability value and handle any errors
  async updateCapabilityValue(name, value) {
    try {
      if (this.getCapabilityValue(name) !== value) {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.getName()}] Capability [${name}] successfully updated to ${value}`);
      }
    } catch (error) {
      this.log(`[${this.getName()}] Error updating capability [${name}]: ${error.message}`);
    }
  }

  // Register the state change listener to listen for updates from the device
  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange);
  }

  // Unregister the state change listener when the device is deleted
  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange);
  }

  // Called when the device is deleted, ensures cleanup
  onDeleted() {
    this.unregisterStateChangeListener();
    this.log(`[${this.getName()}] Device deleted`);
  }
}

module.exports = ZigbeeTemperatureHumiditySensor;
