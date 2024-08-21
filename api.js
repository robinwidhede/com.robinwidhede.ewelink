"use strict";

module.exports = [
  {
    method: "POST",
    path: "/getDevices",
    fn: async (args, callback) => {
      try {
        const result = await Homey.app.sign(args);
        console.log("API Response:", result);
        callback(null, result);
      } catch (error) {
        console.error("Error in API call:", error);
        callback(error, null);
      }
    },
  },
];
