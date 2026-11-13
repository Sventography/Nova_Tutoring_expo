// metro.config.js
// Expo SDK 54 + React Three Fiber / Three.js asset support

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/**
 * Treat 3D model files as static assets instead of source code.
 *
 * - .glb  = self-contained binary glTF model
 * - .gltf = JSON glTF model
 * - .bin  = external geometry buffer sometimes referenced by .gltf
 */
const additionalAssetExtensions = [
  "glb",
  "gltf",
  "bin",
];

for (const extension of additionalAssetExtensions) {
  if (!config.resolver.assetExts.includes(extension)) {
    config.resolver.assetExts.push(extension);
  }
}

module.exports = config;