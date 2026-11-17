// .pbf glyph ranges are bundled as assets. GeoJSON data is imported as .json
// (Metro parses JSON natively; do NOT add it to sourceExts or Babel parses it as JS).
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("pbf");
module.exports = config;
