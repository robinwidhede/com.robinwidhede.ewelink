"use strict";

const { Driver } = require('homey');

class SonoffBasic extends Driver {
  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter((device) =>
        this.isSupportedModel(device.productModel)
      );
      return this.deviceList(filteredDevices);
    } catch (error) {
      this.log('Error fetching devices:', error);
      throw new Error(error);
    }
  }

  isSupportedModel(model) {
    const models = ["Sonoff", "BASIC", "Basic", "Basic2", "BASICRF_R3"];
    return models.includes(model);
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
          mac: device.params.staMac,
          fwVersion: device.params.fwVersion,
          powerResponse: device.params.startup,
          networkLed: device.params.sledOnline,
          duration: device.params.pulse,
          durationLimit: parseFloat(device.params.pulseWidth / 1000),
        },
      };
    });
  }
}

module.exports = SonoffBasic;
