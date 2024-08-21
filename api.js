"use strict";

module.exports = [
  {
    method: "POST",
    path: "/getDevices",
    fn: async (args, callback) => {
      try {
        // Call the sign method in app.js to authenticate and fetch devices
        const result = await Homey.app.sign(args.body);
        console.log("API Response:", result);
        callback(null, result);
      } catch (error) {
        console.error("Error in API call:", error);
        callback(error, null);
      }
    },
  },
];
