"use strict";

const { Driver } = require('homey');

class CoolkitSocket extends Driver {

  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter(device => this.isSupportedDevice(device));
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.error('Failed to list devices during pairing:', error);
      throw new Error(error);
    }
  }

  isSupportedDevice(device) {
    const supportedModels = ["PSC-B67-GL"];
    return supportedModels.includes(device.productModel);
  }

  deviceList(devices) {
    return devices.map(device => {
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
          mac: device.params.staMac,
          fwVersion: device.params.fwVersion,
          powerResponse: device.params.startup,
          networkLed: device.params.sledOnline,
          duration: device.params.pulse,
          durationLimit: parseFloat(device.params.pulseWidth) / 1000,
        },
      };
    });
  }
}

module.exports = CoolkitSocket;
