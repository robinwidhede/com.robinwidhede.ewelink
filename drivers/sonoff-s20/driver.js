"use strict";

const { Driver } = require('homey');

const models = ["S20", "S26", "S26R1"];

class SonoffS20 extends Driver {
  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter((device) => models.includes(device.productModel));
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.error('Error fetching devices:', error.message);
      throw new Error(error.message);
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
        mac: device.params.staMac,
        fwVersion: device.params.fwVersion,
        powerResponse: device.params.startup,
        networkLed: device.params.sledOnline,
        duration: device.params.pulse,
        durationLimit: parseFloat(device.params.pulseWidth / 1000),
      },
    }));
  }
}

module.exports = SonoffS20;
