const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// Repo root (two levels up) — where the linked `react-native-flipper-kit` (file:../..) lives.
const repoRoot = path.resolve(projectRoot, '..', '..');

// This Expo app pins RN 0.79 while the repo root's devDependency is RN 0.85. Because the linked
// module's source physically lives at the repo root, a bare `import 'react-native'` from it would
// otherwise resolve to the root's 0.85 copy and be pulled into the bundle (version/codegen
// mismatch). Force these singletons to THIS app's copy and block the root's copies.
const forcedModules = ['react', 'react-native', 'react-native-flipper-kit'];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), repoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  // Fallback for Expo "phantom" deps: some SDK packages (e.g. expo-font) `import 'expo-asset'`
  // without declaring it, relying on hoisting. On SDK 53 npm nests expo-asset under
  // node_modules/expo/node_modules instead of top-level, so its top-level siblings can't resolve
  // it. Adding expo's own node_modules as a resolver root fixes every such nested dep at once.
  path.resolve(projectRoot, 'node_modules', 'expo', 'node_modules'),
  path.resolve(repoRoot, 'node_modules')
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  ...forcedModules.reduce((acc, name) => {
    acc[name] = path.resolve(projectRoot, 'node_modules', name);
    return acc;
  }, {})
};

const existingBlock = config.resolver.blockList;
const existingBlockArr = Array.isArray(existingBlock) ? existingBlock : existingBlock ? [existingBlock] : [];
config.resolver.blockList = [
  ...existingBlockArr,
  ...forcedModules.map((name) => new RegExp(`^${escapeRegExp(path.resolve(repoRoot, 'node_modules', name))}\\/.*$`))
];

module.exports = config;
