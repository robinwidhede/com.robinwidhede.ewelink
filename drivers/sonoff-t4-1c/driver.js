"use strict";

const { Driver } = require('homey');
const models = ["TX1C"];

class SonoffT41C extends Driver {
  async onPairListDevices() {
    try {
      const devices = await Homey.app.ewelinkApi.getDevices();
      const filteredDevices = this.deviceList(devices.filter((device) => models.includes(device.productModel)));
      return filteredDevices;
    } catch (error) {
      this.error(`Error pairing devices: ${error.message}`);
      throw new Error('Failed to pair devices');
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

module.exports = SonoffT41C;
