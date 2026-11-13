// metro.config.js — SDK 54 safe baseline
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  // Prevent Metro from treating /server as a package/workspace
  config.resolver.blockList = exclusionList([/server\/.*/]);
  return config;
})();
