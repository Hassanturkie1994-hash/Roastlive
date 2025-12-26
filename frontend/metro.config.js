// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Exclude unnecessary directories from file watching to reduce inotify usage
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/android\/.*/,
  /node_modules\/.*\/ios\/.*/,
  /node_modules\/.*\/__tests__\/.*/,
  /node_modules\/.*\/\.git\/.*/,
  /.expo\/.*/,
  /.metro-cache\/.*/,
];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

// Fix for broken @expo/metro-runtime package
// The package.json points to TypeScript source, but we need the JS file
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-runtime') {
    return {
      filePath: path.join(__dirname, 'node_modules/@expo/metro-runtime/async-require.js'),
      type: 'sourceFile',
    };
  }
  // Default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
