/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependency: {
    platforms: {
      android: {
        cmakeListsPath: null,
        packageImportPath: 'import dev.cycleport.flipperkit.ReactNativeFlipperKitPackage;',
        packageInstance: 'new ReactNativeFlipperKitPackage()'
      },
      ios: {}
    }
  }
};
