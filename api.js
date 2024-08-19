"use strict";

module.exports = [
  {
    method: "POST",
    path: "/getDevices",
    fn: async (args, callback) => {
      try {
        const result = await this.homey.app.sign(args);
        console.log("res api", result);
        callback(null, result);
      } catch (error) {
        callback(error, null);
      }
    },
  },
];
