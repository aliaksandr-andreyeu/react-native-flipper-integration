const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, '..');

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [libraryRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(libraryRoot, 'node_modules')]
  }
});
