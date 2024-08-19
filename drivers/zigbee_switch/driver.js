"use strict";

const { Driver } = require("homey");

class ZigbeeSwitch extends Driver {
  onInit() {
    this.log("Zigbee Switch driver has been initialized");

    // Registering FlowCard Triggers for different events
    this.triggers = {
      click: this.homey.flow.getDeviceTriggerCard("click_switch"),
      double_click: this.homey.flow.getDeviceTriggerCard("double_click_switch"),
      long_press: this.homey.flow.getDeviceTriggerCard("long_press_switch"),
    };
  }

  async onPair(session) {
    session.setHandler("list_devices", async () => {
      try {
        const devices = await this.homey.app.ewelinkApi.getDevices();
        const filteredDevices = devices.filter((device) =>
          this.isSupportedDevice(device)
        );
        return this.deviceList(filteredDevices);
      } catch (error) {
        this.error("Error during pairing:", error.message);
        throw new Error("Failed to retrieve devices");
      }
    });
  }

  isSupportedDevice(device) {
    const models = ["zigbee_ON_OFF_SWITCH_1000"];
    return models.includes(device.productModel);
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
