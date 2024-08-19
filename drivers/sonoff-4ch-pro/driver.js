"use strict";

const { Driver, FlowCardAction } = require('homey');

class Sonoff4CHPro extends Driver {

  onInit() {
    this.registerFlowActions();
  }

  registerFlowActions() {
    this.actions = {
      secondChannelOn: new FlowCardAction('secondChannelOn').register(),
      secondChannelOff: new FlowCardAction('secondChannelOff').register(),
      secondChannelToggle: new FlowCardAction('secondChannelToggle').register(),
      threeChannelOn: new FlowCardAction('threeChannelOn').register(),
      threeChannelOff: new FlowCardAction('threeChannelOff').register(),
      threeChannelToggle: new FlowCardAction('threeChannelToggle').register(),
      fourChannelOn: new FlowCardAction('fourChannelOn').register(),
      fourChannelOff: new FlowCardAction('fourChannelOff').register(),
      fourChannelToggle: new FlowCardAction('fourChannelToggle').register(),
    };
  }

  async onPairListDevices() {
    try {
      const devices = await this.homey.app.ewelinkApi.getDevices();
      const pairedDevices = this.deviceList(devices.filter(device => this.isSupportedDevice(device)));
      return pairedDevices;
    } catch (error) {
      this.error('Error fetching devices during pairing:', error.message);
      throw new Error(error);
    }
  }

  isSupportedDevice(device) {
    const models = ["4CH Pro", "4CHPROR2"];
    return models.includes(device.productModel);
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
        settings: this.getDeviceSettings(device),
      };
    });
  }

  getDeviceSettings(device) {
    return {
      brandName: device.brandName,
      model: device.productModel,
      mac: device.params.staMac,
      fwVersion: device.params.fwVersion,
      powerResponse: device.params.startup,
      networkLed: device.params.sledOnline,
      duration1channel: device.params.pulses?.[0]?.pulse || null,
      durationLimit1channel: device.params.pulses?.[0]?.width ? parseFloat(device.params.pulses[0].width / 1000) : null,
      duration2channel: device.params.pulses?.[1]?.pulse || null,
      durationLimit2channel: device.params.pulses?.[1]?.width ? parseFloat(device.params.pulses[1].width / 1000) : null,
      duration3channel: device.params.pulses?.[2]?.pulse || null,
      durationLimit3channel: device.params.pulses?.[2]?.width ? parseFloat(device.params.pulses[2].width / 1000) : null,
      duration4channel: device.params.pulses?.[3]?.pulse || null,
      durationLimit4channel: device.params.pulses?.[3]?.width ? parseFloat(device.params.pulses[3].width / 1000) : null,
    };
  }
}

module.exports = Sonoff4CHPro;
