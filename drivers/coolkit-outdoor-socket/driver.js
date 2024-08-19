"use strict";

const { Driver } = require('homey');

class CoolKitOutdoorSocket extends Driver {

  async onInit() {
    this.log('CoolKitOutdoorSocket driver has been initialized');
  }

  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = this.deviceList(devices.filter(device => this.isValidDevice(device)));
      return filteredDevices;
    } catch (error) {
      this.error('Error listing devices:', error);
      throw new Error(this.homey.__('error.list_devices_failed'));
    }
  }

  isValidDevice(device) {
    const models = ["PS-16"];
    return models.includes(device.productModel);
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

module.exports = CoolKitOutdoorSocket;
