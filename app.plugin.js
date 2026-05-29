const { withGradleProperties, createGradlePropertiesItem } = require('@expo/config-plugins');

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

  config = withGradleProperties(config, (gradleProperties) => {
    const filtered = gradleProperties.filter(
      (item) => item.type !== 'property' || (!item.key?.startsWith('FLIPPER_') && item.key !== 'NO_FLIPPER')
    );

    gradleProperties.length = 0;
    gradleProperties.push(...filtered);

    gradleProperties.push(createGradlePropertiesItem('FLIPPER_DEBUG_ONLY', String(flipperDebugOnly)));

    if (noFlipper) {
      gradleProperties.push(createGradlePropertiesItem('NO_FLIPPER', '1'));
    }

    return gradleProperties;
  });

  return config;
}

module.exports = withFlipperIntegration;
