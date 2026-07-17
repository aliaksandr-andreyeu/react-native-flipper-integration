require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

# Resolve a Flipper config flag: ENV first (bare RN / `FLIPPER_DEBUG_ONLY=... pod install`),
# then the app's ios/Podfile.properties.json (written by the Expo config plugin during
# `expo prebuild`). The podspec lives in node_modules, so the app's properties file is
# located via CocoaPods' installation_root rather than a relative path.
# A lambda (local variable), NOT a top-level `def`: CocoaPods evaluates this podspec in the
# `Pod` module's scope, where a bareword `def` is not callable as a plain method (it raises
# `undefined method ... for module Pod`). A local lambda is captured by the surrounding eval
# scope and works reliably.
flipper_integration_prop = lambda do |key|
  next ENV[key] if ENV.key?(key)

  begin
    root = Pod::Config.instance.installation_root.to_s
    props_path = File.join(root, 'Podfile.properties.json')
    next nil unless File.exist?(props_path)

    JSON.parse(File.read(props_path))[key]
  rescue StandardError => e
    # Don't fail pod install on a malformed properties file, but don't swallow it
    # silently either — fall back to ENV/defaults and surface why.
    warn "[ReactNativeFlipperKit] Could not read #{key} from Podfile.properties.json " \
         "(#{e.class}: #{e.message}); falling back to ENV/default."
    nil
  end
end

flipper_debug_only = flipper_integration_prop.call('FLIPPER_DEBUG_ONLY') != 'false'
flipper_enabled = flipper_integration_prop.call('NO_FLIPPER') != '1'
# When false, the +load auto-initializer does not start Flipper; the app must call
# initializeFlipper() from JS.
flipper_auto_init = flipper_integration_prop.call('FLIPPER_AUTO_INIT') != 'false'
# NOTE: iOS pins an older Flipper than Android (see android/build.gradle, 0.273.0).
# The divergence is intentional: CocoaPods does not publish every Android Flipper release
# for iOS, so each platform tracks the latest version its ecosystem actually ships.
flipper_version = flipper_integration_prop.call('FLIPPER_VERSION') || '0.252.0'
flipper_configurations = flipper_debug_only ? ['Debug'] : ['Debug', 'Release']

Pod::Spec.new do |s|
  s.name         = 'ReactNativeFlipperKit'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  # package.author is an object ({ name, url }); CocoaPods wants a name string/array
  # or a name => email hash, so map it explicitly rather than passing the raw object.
  s.authors      = package['author'].is_a?(Hash) ? package['author']['name'] : package['author']
  s.homepage     = package['homepage']
  s.source       = { :path => '.' }
  s.platforms    = { :ios => '13.0' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.public_header_files = 'ios/**/*.h'

  flipper_defs = [
    "FLIPPER_DEBUG_ONLY=#{flipper_debug_only ? 1 : 0}",
    "FLIPPER_ENABLED=#{flipper_enabled ? 1 : 0}",
    "FLIPPER_AUTO_INIT=#{flipper_auto_init ? 1 : 0}",
  ]

  # NOTE: FB_SONARKIT_ENABLED is defined for every configuration (CocoaPods cannot
  # scope pod_target_xcconfig per build config). That is safe because the FlipperKit
  # code in ReactNativeFlipperKitConfig.mm is additionally guarded by
  # `__has_include(<FlipperKit/FlipperClient.h>)` — when debug-only, the FlipperKit
  # pods are linked only in Debug (see `flipper_configurations`), so the guard is the
  # authoritative gate and the macro being present in Release is a no-op.
  if flipper_enabled
    flipper_defs << 'FB_SONARKIT_ENABLED=1'
  end

  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => "$(inherited) #{flipper_defs.join(' ')}",
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => "$(inherited) #{flipper_enabled ? 'FB_SONARKIT_ENABLED' : ''}",
  }

  if defined?(install_modules_dependencies)
    install_modules_dependencies(s)
  else
    s.dependency 'React-Core'
  end

  if flipper_enabled
    [
      'FlipperKit',
      'FlipperKit/FlipperKitLayoutPlugin',
      'FlipperKit/SKIOSNetworkPlugin',
      'FlipperKit/FlipperKitUserDefaultsPlugin',
      'FlipperKit/FlipperKitReactPlugin',
      'FlipperKit/FlipperKitNetworkPlugin',
      'Flipper',
    ].each do |dep|
      s.dependency dep, flipper_version, :configurations => flipper_configurations
    end
  end
end
