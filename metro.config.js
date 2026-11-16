// Bundle .geojson as JSON source (aero overlay) and .pbf as an asset (glyphs).
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("geojson");
config.resolver.assetExts.push("pbf");
module.exports = config;
