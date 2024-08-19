"use strict";

const Homey = require("homey");
const models = ["zigbee_ON_OFF_SWITCH_1000"];

class ZigbeeSwitch extends Homey.Driver {
  onInit() {
    this.log("Zigbee Switch driver has been initialized");

    // Registering FlowCard Triggers for different events
    this.triggers = {
      click: new Homey.FlowCardTriggerDevice("click_switch").register(),
      double_click: new Homey.FlowCardTriggerDevice("double_click_switch").register(),
      long_press: new Homey.FlowCardTriggerDevice("long_press_switch").register(),
    };
  }

  async onPairListDevices() {
    try {
      const devices = await Homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter((device) => models.includes(device.productModel));
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.error("Error during pairing:", error);
      throw new Error("Failed to retrieve devices");
    }
  }

  deviceList(devices) {
    return devices.map((device) => ({
      name: `${device.productModel} ${device.name}`,
      data: {
        deviceid: device.deviceid,
        apikey: device.apikey,
        uiid: device.extra.uiid,
      },
      settings: {
        brandName: device.brandName,
        model: device.productModel,
      },
    }));
  }
}

module.exports = ZigbeeSwitch;
