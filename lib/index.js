const EventEmitter = require("events");
const Homey = require("homey");
const eWeLinkHTTP = require("./http");
const eWeLinkLAN = require("./lan");
const eWeLinkWS = require("./ws");
const util = require("./util");
const promInterval = require("interval-promise");
const Rollbar = require("rollbar");
const appJSON = require("../app.json");

class Ewelink extends EventEmitter {
  constructor(log) {
    super();
    this.setMaxListeners(150); // Setting the maximum listeners to avoid warnings
    this.log = log;
    this.log("Ewelink initialized!");
    this.debug = false;
    this.devicesInHomey = new Map();
    this.devicesInEwelink = new Map();
    this.wsRefreshFlag = true;
    this.updateInProgress = false;

    // Bind methods to the instance
    this.sendDeviceUpdate = this.sendDeviceUpdate.bind(this);
    this.connect = this.connect.bind(this);

    this.rollbar = new Rollbar({
      accessToken: "968df07261cd43fa994e11f678f3dc7a",
      captureUncaught: true,
      captureUnhandledRejections: true,
    });

    // Initialize the API clients but don't connect yet
    this.httpClient = null;
    this.wsClient = null;
    this.lanClient = null;

    // Check if there are any devices to be initialized after pairing
    if (Homey.ManagerSettings && Homey.ManagerSettings.get) {
      const account = Homey.ManagerSettings.get("account");
      if (account) {
        this.log("Account information found:", account);
        this.connect(account);
      } else {
        this.log("No account information found.");
      }
    } else {
      this.log('Homey ManagerSettings or its get method is undefined.');
    }
  }

  async connect(account) {
    try {
      if (!account?.countryCode) {
        throw new Error("Country code not indicated!");
      }

      const config = {
        username: account.login,
        password: account.password,
        countryCode: account.countryCode,
        ipOverride: [],
        debug: false,
        debugReqRes: false,
      };

      this.httpClient = new eWeLinkHTTP(config, this.log);
      await this.httpClient.getHost();
      this.authData = await this.httpClient.login();

      const deviceList = await this.httpClient.getDevices();
      deviceList.forEach((device) => this.devicesInEwelink.set(device.deviceid, device));

      this.rollbar.info(JSON.stringify({ appVersion: appJSON.version, deviceList }, null, 2));

      this.wsClient = new eWeLinkWS(config, this.log, this.authData);
      await this.wsClient.getHost();
      await this.wsClient.login();

      this.lanClient = new eWeLinkLAN(config, this.log, deviceList);
      await this.lanClient.getHosts();
      await this.lanClient.startMonitor();

      deviceList.forEach((device) => {
        this.wsClient.requestUpdate(device);
      });

      this.wsClient.receiveUpdate(this.receiveDeviceUpdate.bind(this));
      this.lanClient.receiveUpdate(this.receiveDeviceUpdate.bind(this));

      this.wsRefresh = promInterval(async () => {
        if (this.wsRefreshFlag) {
          try {
            if (this.wsClient) {
              await this.wsClient.getHost();
              await this.wsClient.closeConnection();
              await util.sleep(250);
              await this.wsClient.login();
            }
          } catch (err) {
            this.log(this.debug ? err : err.message);
          }
        }
      }, 1800000, { stopOnError: false });

      this.log("API successfully started");
    } catch (error) {
      this.log(error.message);
    }
  }

  receiveDeviceUpdate(device) {
    this.emit(device.deviceid, device);
  }

  sign(signData) {
    return new Promise(async (resolve, reject) => {
      try {
        const config = {
          username: signData.body.login,
          password: signData.body.password,
          countryCode: signData.body.countryCode,
        };

        this.httpClient = new eWeLinkHTTP(config, this.log);
        await this.httpClient.getHost();
        this.authData = await this.httpClient.login();

        const deviceList = await this.httpClient.getDevices();
        resolve({ status: "ok", deviceList });
      } catch (error) {
        reject({ status: "error", msg: error.message });
      }
    });
  }

  async getDevices() {
    return await this.httpClient.getDevices();
  }

  eWeLinkShutdown() {
    try {
      if (this.lanClient) this.lanClient.closeConnection();
      if (this.wsClient) this.wsClient.closeConnection();
    } catch (err) {
      this.log(this.debug ? err : err.message);
    }
    this.wsRefreshFlag = false;
  }

  async sendDeviceUpdate(device, params) {
    await util.sleep(Math.random() * 90 + 10); // Sleep for a random time between 10 and 100ms

    if (this.updateInProgress) {
      await util.sleep(400);
      return this.sendDeviceUpdate(device, params);
    }

    this.updateInProgress = true;
    setTimeout(() => (this.updateInProgress = false), 350);

    const payload = {
      apikey: device.apikey,
      deviceid: device.deviceid,
      params,
    };

    const res = util.devicesNonLAN.includes(device.uiid)
      ? "LAN mode is not supported for this device"
      : await this.lanClient.sendUpdate(payload);

    if (res !== "ok") {
      if (device.api === "ws") {
        if (this.debug) this.log(`[${device.name}] Reverting to web socket as ${res}.`);
        await this.wsClient.sendUpdate(payload);
      } else {
        throw new Error("Device is unreachable. Its status will be corrected once it is reachable.");
      }
    }
  }
}

module.exports = Ewelink;
