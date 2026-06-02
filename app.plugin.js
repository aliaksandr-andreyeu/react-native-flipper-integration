const { withGradleProperties } = require('@expo/config-plugins');

function createProperty(key, value) {
  return { type: 'property', key, value };
}

/**
 * Expo config plugin for react-native-flipper-integration.
 *
 * app.json / app.config.js:
 * ```js
 * plugins: [
 *   ['react-native-flipper-integration', { flipperDebugOnly: true }]
 * ]
 * ```
 */
function withFlipperIntegration(config, options = {}) {
  const flipperDebugOnly = options.flipperDebugOnly !== false;
  const noFlipper = options.noFlipper === true;

  return withGradleProperties(config, (configWithProps) => {
    const isModObject = Array.isArray(configWithProps?.modResults);
    const gradleProperties = isModObject ? configWithProps.modResults : configWithProps;

    if (!Array.isArray(gradleProperties)) {
      throw new Error(
        'react-native-flipper-integration: withGradleProperties received an unexpected argument. ' +
          'Update to the latest version of this package.'
      );
    }

    const filtered = gradleProperties.filter(
      (item) => item.type !== 'property' || (!item.key?.startsWith('FLIPPER_') && item.key !== 'NO_FLIPPER')
    );

    filtered.push(createProperty('FLIPPER_DEBUG_ONLY', String(flipperDebugOnly)));

    if (noFlipper) {
      filtered.push(createProperty('NO_FLIPPER', '1'));
    }

    if (isModObject) {
      configWithProps.modResults = filtered;
      return configWithProps;
    }

    gradleProperties.length = 0;
    gradleProperties.push(...filtered);
    return gradleProperties;
  });
}

module.exports = withFlipperIntegration;
