"use strict";

const { Driver } = require('homey');

class Generic extends Driver {

  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter(device => device.uiid === 1 && !this.isExcludedModel(device.productModel));
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.error('Error listing devices during pairing', error);
      throw error;
    }
  }

  isExcludedModel(productModel) {
    const models = ["Sonoff", "BASIC", "Basic", "Basic2", "MINI"];
    return models.includes(productModel);
  }

  deviceList(devices) {
    return devices.map(device => ({
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
        durationLimit: parseFloat(device.params.pulseWidth) / 1000,
      },
    }));
  }
}

module.exports = Generic;
