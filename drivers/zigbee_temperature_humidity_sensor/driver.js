"use strict";

const { Driver } = require("homey");
const models = ["ZCL_HA_DEVICEID_TEMPERATURE_SENSOR"];

class ZigbeeTemperatureHumiditySensor extends Driver {

  onInit() {
    this.log('ZigbeeTemperatureHumiditySensor driver initialized');
  }

  async onPairListDevices() {
    try {
      // Fetch devices using the eWeLink API from the Homey app instance
      const devices = await this.homey.app.ewelinkApi.getDevices();
      
      // Filter devices based on the predefined models and generate a list for pairing
      const pairedDevices = this.deviceList(devices.filter(device => models.includes(device.productModel)));
      
      return pairedDevices;
    } catch (error) {
      this.error('Error fetching devices:', error.message);
      throw new Error('Failed to list devices during pairing');
    }
  }

  deviceList(devices) {
    // Map the device data to the format expected by the Homey app
    return devices.map(device => ({
      name: `${device.productModel} ${device.name}`,
      data: {
        id: device.deviceid,
        apikey: device.apikey,
        uiid: device.extra.uiid,
      },
      settings: {
        brandName: device.brandName,
        model: device.productModel,
        mac: device.params.staMac,
        fwVersion: device.params.fwVersion,
      },
    }));
  }
}

module.exports = ZigbeeTemperatureHumiditySensor;
