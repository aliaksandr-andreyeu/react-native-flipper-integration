module.exports = {
  dependency: {
    platforms: {
      android: {
        cmakeListsPath: null,
        packageImportPath: 'import com.flipperintegration.FlipperIntegrationPackage;',
        packageInstance: 'new FlipperIntegrationPackage()'
      },
      ios: {}
    }
  }
};
