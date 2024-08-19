"use strict";

const { Driver } = require('homey');
const models = ["GSM G1"];

class SonoffG1GSM extends Driver {
  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const pairedDevices = this.deviceList(devices.filter(device => models.includes(device.productModel)));
      return pairedDevices;
    } catch (error) {
      this.error('Error listing devices during pairing:', error);
      throw error;
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

module.exports = SonoffG1GSM;
