"use strict";

const { Device } = require('homey');

class ZigbeeSwitch extends Device {
  async onInit() {
    this.log("Zigbee Switch device has been inited");

    // Bind functions to ensure proper `this` context
    this.handleStateChange = this.handleStateChange.bind(this);

    // Register state change listener
    this.registerStateChangeListener();
  }

  async handleStateChange(device) {
    const { triggers } = this.driver;

    if (device.params) {
      if (device.params.battery) {
        await this.updateCapabilityValue("measure_battery", parseInt(device.params.battery));
        await this.updateCapabilityValue("alarm_battery", parseInt(device.params.battery) <= 20);
      }
      if (device.params.key === 0) await this.triggerFlow(triggers.click, "click");
      if (device.params.key === 1) await this.triggerFlow(triggers.double_click, "double_click");
      if (device.params.key === 2) await this.triggerFlow(triggers.long_press, "long_press");
    }
  }

  async updateCapabilityValue(name, value) {
    const currentValue = this.getCapabilityValue(name);
    if (currentValue !== value) {
      try {
        await this.setCapabilityValue(name, value);
        this.log(`[${this.data.deviceid}] [${name}] [${value}] Capability successfully updated`);
      } catch (error) {
        this.error(`[${this.data.deviceid}] [${name}] [${value}] Capability not updated due to error: ${error.message}`);
      }
    }
  }

  async triggerFlow(trigger, name) {
    if (trigger) {
      try {
        await trigger.trigger(this, {}, {});
        this.log(`Flow triggered: ${name}`);
      } catch (error) {
        this.error(`Error triggering flow ${name}: ${error.message}`);
      }
    }
  }

  registerStateChangeListener() {
    Homey.app.ewelinkApi.on(this.data.deviceid, this.handleStateChange);
  }

  unregisterStateChangeListener() {
    Homey.app.ewelinkApi.removeListener(this.data.deviceid, this.handleStateChange);
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = ZigbeeSwitch;
