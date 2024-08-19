"use strict";

const { Driver } = require('homey');
const models = ["MINI"];

class SonoffMiniDriver extends Driver {
  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const pairedDevices = this.deviceList(devices.filter(device => models.includes(device.productModel)));
      return pairedDevices;
    } catch (error) {
      this.homey.error('Failed to list devices:', error);
      throw new Error('Failed to list devices');
    }
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
        durationLimit: parseFloat(device.params.pulseWidth / 1000),
      },
    }));
  }
}

module.exports = SonoffMiniDriver;
