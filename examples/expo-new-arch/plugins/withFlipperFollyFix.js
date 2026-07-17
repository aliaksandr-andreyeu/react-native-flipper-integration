const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Example-only Expo config plugin: patch Flipper-Folly for the Xcode 16 / C++20 toolchain.
 *
 * Flipper-Folly 2.6.x has `static_assert(std::is_trivial<GlobalState>::value, "not trivial")` in
 * folly/concurrency/CacheLocality.h, which FAILS under Xcode 16 because the type is no longer
 * "trivial" under modern C++. folly upstream switched this check to `std::is_trivially_destructible`
 * (GlobalState has a trivial destructor), but Flipper-Folly is frozen — so we patch its header
 * during `pod install`. See https://github.com/facebook/flipper/issues/5683
 *
 * Delivered as a Podfile `post_install` injection (rather than a hand-edited Podfile) because
 * `expo prebuild` regenerates ios/Podfile and would wipe manual edits. Same as bare-new-arch's
 * Podfile fix, but plugin-delivered so it survives prebuild.
 */

const MARKER = 'react-native-flipper-kit: Flipper-Folly Xcode 16 patch';

const PATCH = `
    # ${MARKER}
    cache_locality = File.join(installer.sandbox.root, 'Flipper-Folly', 'folly', 'concurrency', 'CacheLocality.h')
    if File.exist?(cache_locality)
      original = File.read(cache_locality)
      patched = original.gsub(
        'std::is_trivial<GlobalState>::value',
        'std::is_trivially_destructible<GlobalState>::value'
      )
      if patched != original
        File.write(cache_locality, patched)
        Pod::UI.puts '[react-native-flipper-kit] Patched Flipper-Folly CacheLocality.h for Xcode 16'.green
      end
    end
`;

module.exports = function withFlipperFollyFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        // Inject at the top of the existing post_install block (CocoaPods allows only one).
        contents = contents.replace(/(post_install do \|installer\|\n)/, `$1${PATCH}`);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
