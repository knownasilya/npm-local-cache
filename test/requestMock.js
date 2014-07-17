'use strict';

/**
 * A mock request service, that returns the response passed.
 * If the response is a function, the return value is the
 * value of invoking that function.
 */
module.exports = function (response) {
  return {
    get: function (options, callback) {
      var result = response;
      if (typeof response === "function") {
        result = response();
      }
      callback(undefined, undefined, result);
    }
  };
}