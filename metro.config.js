// Bundle .geojson as JSON source (the aeronautical overlay layers).
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("geojson");
module.exports = config;
