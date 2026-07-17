const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Example-only Expo config plugin: patch FlipperKit's frozen C++ deps for the Xcode 16 toolchain.
 * Delivered as a Podfile `post_install` injection (not a hand-edited Podfile) because `expo prebuild`
 * regenerates ios/Podfile and would wipe manual edits. Mirrors bare-old-arch's working Podfile.
 *
 * CRITICAL: this block is injected AFTER `react_native_post_install(...)`. RN's post_install rewrites
 * build settings on the pod targets, so setting them before it would be clobbered (that's why an
 * earlier top-of-block injection left fmt still failing).
 *
 * Three fixes:
 * 1. Flipper-Folly 2.6.x `static_assert(std::is_trivial<GlobalState>)` → `is_trivially_destructible`
 *    (header patch). Xcode 16 no longer treats the type as trivial. facebook/flipper#5683
 * 2. fmt 11.0.2 (pulled by RCT-Folly) `consteval` format-string ctor rejected by Apple clang →
 *    build the `fmt` pod as C++17 (no consteval → runtime validation). react-native#55601
 * 3. RN's boost 1.84 vs FlipperKit's frozen Flipper-Boost 1.76 (boost 1.84 dropped
 *    `exception_array_disposer` that Flipper-Boost's hashtable.hpp needs) → put Flipper-Boost's
 *    headers FIRST on HEADER_SEARCH_PATHS for Flipper* targets so <boost/...> resolves to 1.76.
 */

const MARKER = 'react-native-flipper-kit: FlipperKit Xcode 16 patches';

const PATCH = `
    # ${MARKER} — MUST run after react_native_post_install (it rewrites pod build settings).
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
    installer.pods_project.targets.each do |fk_target|
      fk_target.build_configurations.each do |fk_config|
        if fk_target.name == 'fmt'
          fk_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
        if fk_target.name.start_with?('Flipper')
          fk_boost = '"$(PODS_ROOT)/Flipper-Boost-iOSX"'
          hsp = fk_config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
          hsp = [hsp] if hsp.is_a?(String)
          hsp.unshift(fk_boost) unless hsp.include?(fk_boost)
          fk_config.build_settings['HEADER_SEARCH_PATHS'] = hsp
        end
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
        // Inject right AFTER the react_native_post_install(...) call so our build-setting
        // overrides win. Match the multi-line call up to its closing paren on its own line.
        const re = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
        if (!re.test(contents)) {
          throw new Error(
            'withFlipperFollyFix: could not find react_native_post_install() in Podfile to anchor the patch'
          );
        }
        contents = contents.replace(re, `$1${PATCH}`);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
