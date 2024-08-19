"use strict";

const { Driver } = require('homey');

class ABC20LEDDriver extends Driver {
  onInit() {
    this.log('ABC20LED driver has been initialized');

    // Registering the Flow action
    this.actions = {
      setRGBMode: this.homey.flow.getActionCard('setRGBMode').registerRunListener(this.onSetRGBMode.bind(this)),
    };
  }

  async onPair(session) {
    // Register the listDevices function to provide the devices during pairing
    session.setHandler('list_devices', async () => {
      try {
        const devices = await this.homey.app.ewelinkApi.getDevices();
        return this.deviceList(devices.filter((device) => this.isSupportedModel(device)));
      } catch (error) {
        this.log('Error listing devices during pairing:', error.message);
        throw new Error('Failed to list devices');
      }
    });
  }

  isSupportedModel(device) {
    const models = ["2.0-led"];
    return models.includes(device.productModel);
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
      },
    }));
  }

  async onSetRGBMode(args) {
    try {
      const { device } = args;
      const { deviceid, apikey, uiid } = device.getData();
      const data = {
        name: device.getName(),
        deviceid,
        apikey,
        uiid,
        api: 'ws',
      };

      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switch: 'on', mode: parseInt(args.mode) });
      return true;
    } catch (error) {
      this.log('Error in setRGBMode Flow action:', error.message);
      throw new Error('Failed to set RGB mode');
    }
  }
}

module.exports = ABC20LEDDriver;
