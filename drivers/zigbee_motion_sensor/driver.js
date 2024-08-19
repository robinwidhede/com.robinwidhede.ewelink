"use strict";

const { Driver } = require('homey');

class ZigbeeMotionSensor extends Driver {
  
  async onPairListDevices() {
    try {
      const devices = await Homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter((device) => models.includes(device.productModel));
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.error('Error fetching devices:', error);
      throw new Error(error.message);
    }
  }

  deviceList(devices) {
    return devices.map((device) => {
      return {
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
      };
    });
  }
}

module.exports = ZigbeeMotionSensor;
