const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..', '..');

// RN 0.76 example vs repo root RN 0.85 — force this app's copies of shared singletons.
const forcedModules = ['react', 'react-native', 'react-native-flipper-kit'];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [repoRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(repoRoot, 'node_modules')],
    extraNodeModules: forcedModules.reduce((acc, name) => {
      acc[name] = path.resolve(projectRoot, 'node_modules', name);
      return acc;
    }, {}),
    blockList: forcedModules.map(
      (name) => new RegExp(`^${escapeRegExp(path.resolve(repoRoot, 'node_modules', name))}\\/.*$`)
    )
  }
});
