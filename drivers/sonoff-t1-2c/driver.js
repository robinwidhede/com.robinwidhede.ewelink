"use strict";

const { Driver } = require('homey');

class SonoffT12C extends Driver {
  async onPairListDevices() {
    try {
      const devices = await Homey.app.ewelinkApi.getDevices();
      const filteredDevices = this.deviceList(devices.filter((device) => this.isSupportedModel(device)));
      return filteredDevices;
    } catch (error) {
      this.error('Error fetching devices:', error);
      throw new Error('Failed to fetch devices.');
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

  isSupportedModel(device) {
    const supportedModels = ["T1 2C"];
    return supportedModels.includes(device.productModel);
  }
}

module.exports = SonoffT12C;
