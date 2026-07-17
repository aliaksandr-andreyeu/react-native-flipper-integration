const { withGradleProperties, withPodfileProperties } = require('@expo/config-plugins');

function createProperty(key, value) {
  return { type: 'property', key, value };
}

/**
 * Expo config plugin for react-native-flipper-kit.
 *
 * app.json / app.config.js:
 * ```js
 * plugins: [
 *   ['react-native-flipper-kit', { flipperDebugOnly: true }]
 * ]
 * ```
 *
 * Options:
 * - `flipperDebugOnly` (default `true`) — Flipper runs in Debug builds only.
 * - `noFlipper` (default `false`) — disable Flipper entirely (no-op delegate).
 * - `flipperAutoInit` (default `true`) — auto-start Flipper on launch. Set `false` to require
 *   an explicit `initializeFlipper()` call from JS (app controls init timing).
 * - `flipperVersion` (optional) — override the Flipper SDK version. Applied to
 *   Android only: CocoaPods does not publish every Android Flipper version for
 *   iOS, so the iOS FlipperKit version is left at the podspec default unless you
 *   set `FLIPPER_VERSION` explicitly at `pod install` time.
 */
function withRNFlipperKit(config, options = {}) {
  const flipperDebugOnly = options.flipperDebugOnly !== false;
  const noFlipper = options.noFlipper === true;
  const flipperAutoInit = options.flipperAutoInit !== false;
  const flipperVersion = options.flipperVersion;

  config = withFlipperGradleProperties(config, {
    flipperDebugOnly,
    noFlipper,
    flipperAutoInit,
    flipperVersion
  });
  config = withFlipperPodfileProperties(config, { flipperDebugOnly, noFlipper, flipperAutoInit });

  return config;
}

/** Android: write FLIPPER_* into gradle.properties. */
function withFlipperGradleProperties(config, { flipperDebugOnly, noFlipper, flipperAutoInit, flipperVersion }) {
  return withGradleProperties(config, (configWithProps) => {
    const isModObject = Array.isArray(configWithProps?.modResults);
    const gradleProperties = isModObject ? configWithProps.modResults : configWithProps;

    if (!Array.isArray(gradleProperties)) {
      throw new Error(
        'react-native-flipper-kit: withGradleProperties received an unexpected argument. ' +
          'Update to the latest version of this package.'
      );
    }

    // Strip ONLY the keys this plugin manages. A user-set FLIPPER_VERSION (and any
    // other FLIPPER_* they control) is preserved unless we are explicitly overriding it.
    const managedKeys = new Set(['FLIPPER_DEBUG_ONLY', 'NO_FLIPPER', 'FLIPPER_AUTO_INIT']);
    if (flipperVersion) {
      managedKeys.add('FLIPPER_VERSION');
    }

    const filtered = gradleProperties.filter((item) => item.type !== 'property' || !managedKeys.has(item.key));

    filtered.push(createProperty('FLIPPER_DEBUG_ONLY', String(flipperDebugOnly)));
    filtered.push(createProperty('FLIPPER_AUTO_INIT', String(flipperAutoInit)));

    if (noFlipper) {
      filtered.push(createProperty('NO_FLIPPER', '1'));
    }

    if (flipperVersion) {
      filtered.push(createProperty('FLIPPER_VERSION', String(flipperVersion)));
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

/**
 * iOS: write FLIPPER_* into ios/Podfile.properties.json. The podspec reads these
 * as a fallback to ENV (ENV wins), so `expo prebuild` configures iOS the same way
 * `FLIPPER_DEBUG_ONLY=... pod install` does for bare React Native.
 */
function withFlipperPodfileProperties(config, { flipperDebugOnly, noFlipper, flipperAutoInit }) {
  return withPodfileProperties(config, (configWithProps) => {
    const properties = configWithProps.modResults ?? {};

    properties.FLIPPER_DEBUG_ONLY = String(flipperDebugOnly);
    properties.FLIPPER_AUTO_INIT = String(flipperAutoInit);

    if (noFlipper) {
      properties.NO_FLIPPER = '1';
    } else {
      delete properties.NO_FLIPPER;
    }

    configWithProps.modResults = properties;
    return configWithProps;
  });
}

module.exports = withRNFlipperKit;
