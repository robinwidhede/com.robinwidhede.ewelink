"use strict";

const { Device } = require('homey');

class Sonoff4CHPro extends Device {
  
  async onInit() {
    this.log(`${this.getName()} has been initialized`);
    this.registerStateChangeListener();
    this.registerChannelToggle('onoff', 0);
    this.registerChannelToggle('onoff.1', 1);
    this.registerChannelToggle('onoff.2', 2);
    this.registerChannelToggle('onoff.3', 3);
    this.registerActions();
  }

  registerActions() {
    const actions = this.driver.actions;
    this.registerToggleAction('onoff.1', actions.secondChannelOn);
    this.registerToggleAction('onoff.1', actions.secondChannelOff);
    this.registerToggleAction('onoff.1', actions.secondChannelToggle);
    this.registerToggleAction('onoff.2', actions.threeChannelOn);
    this.registerToggleAction('onoff.2', actions.threeChannelOff);
    this.registerToggleAction('onoff.2', actions.threeChannelToggle);
    this.registerToggleAction('onoff.3', actions.fourChannelOn);
    this.registerToggleAction('onoff.3', actions.fourChannelOff);
    this.registerToggleAction('onoff.3', actions.fourChannelToggle);
  }

  handleStateChange(device) {
    if (device.params) {
      device.params.online ? this.setAvailable() : this.setUnavailable();

      if (device.params.switches) {
        this.updateCapabilityValue('onoff', device.params.switches[0].switch === 'on');
        this.updateCapabilityValue('onoff.1', device.params.switches[1].switch === 'on');
        this.updateCapabilityValue('onoff.2', device.params.switches[2].switch === 'on');
        this.updateCapabilityValue('onoff.3', device.params.switches[3].switch === 'on');
      }

      if (device.params.updateSource) {
        this.setStoreValue('api', device.params.updateSource.toLowerCase());
      }

      this.updateSettings(device.params);
    }
  }

  async updateSettings(params) {
    const settings = {};

    if (params.startup) settings.powerResponse = params.startup;
    if (params.sledOnline) settings.networkLed = params.sledOnline;
    if (params.pulse) settings.duration = params.pulse;
    if (params.pulseWidth) settings.durationLimit = parseFloat(params.pulseWidth) / 1000;

    await this.setSettings(settings).catch(this.error);
  }

  async registerChannelToggle(capability, channel) {
    this.registerCapabilityListener(capability, async (value) => {
      const switches = Array.from({ length: 4 }).map((_, index) => ({
        outlet: index,
        switch: this.getCapabilityValue(`onoff${index === 0 ? '' : '.' + index}`) ? 'on' : 'off',
      }));
      switches[channel].switch = value ? 'on' : 'off';

      const data = this.getDeviceData();
      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switches });
    });
  }

  registerToggleAction(capability, action) {
    action.registerRunListener(async (args) => {
      const data = this.getDeviceData();
      const switches = Array.from({ length: 4 }).map((_, index) => ({
        outlet: index,
        switch: this.getCapabilityValue(`onoff${index === 0 ? '' : '.' + index}`) ? 'on' : 'off',
      }));

      const channel = capability === 'onoff' ? 0 : parseInt(capability.split('.')[1]);
      const toggleAction = action.id.split(/(?=[A-Z])/).pop().toLowerCase();
      
      switches[channel].switch = toggleAction;

      await this.homey.app.ewelinkApi.sendDeviceUpdate(data, { switches });
      return true;
    });
  }

  getDeviceData() {
    return {
      name: this.getName(),
      deviceid: this.getData().deviceid,
      apikey: this.getData().apikey,
      uiid: this.getData().uiid,
      api: "ws",
    };
  }

  registerStateChangeListener() {
    this.homey.app.ewelinkApi.on(this.getData().deviceid, this.handleStateChange.bind(this));
  }

  unregisterStateChangeListener() {
    this.homey.app.ewelinkApi.removeListener(this.getData().deviceid, this.handleStateChange.bind(this));
  }

  onDeleted() {
    this.unregisterStateChangeListener();
    this.log('Device deleted');
  }
}

module.exports = Sonoff4CHPro;
