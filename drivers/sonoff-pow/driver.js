"use strict";

const { Driver } = require('homey');
const models = ["Sonoff Pow", "Pow_R2"];

const deviceCapabilities = {
  "Sonoff Pow": ["onoff", "measure_power"],
  "Pow_R2": ["onoff", "measure_power", "meter_power", "measure_voltage"]
};

class SonoffPow extends Driver {
  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const filteredDevices = devices.filter((device) => models.includes(device.productModel));
      return this.deviceList(filteredDevices);
    } catch (error) {
      throw new Error(`Error fetching devices: ${error.message}`);
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
      capabilities: deviceCapabilities[device.productModel] || [],
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

module.exports = SonoffPow;
