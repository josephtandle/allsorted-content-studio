"use strict";

function readArg(input, keys, fallback = undefined) {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    if (input && typeof input === "object" && Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return fallback;
}

function readBool(input, keys, fallback = false) {
  const value = readArg(input, keys, fallback);
  return value === true || value === "true" || value === "1";
}

module.exports = { readArg, readBool };
