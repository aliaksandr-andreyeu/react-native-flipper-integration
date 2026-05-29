require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

flipper_debug_only = ENV['FLIPPER_DEBUG_ONLY'] != 'false'
flipper_enabled = ENV['NO_FLIPPER'] != '1'
flipper_version = ENV['FLIPPER_VERSION'] || '0.252.0'
flipper_configurations = flipper_debug_only ? ['Debug'] : ['Debug', 'Release']

Pod::Spec.new do |s|
  s.name         = 'FlipperIntegration'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.authors      = package['author']
  s.homepage     = package['repository']['url']
  s.source       = { :path => '.' }
  s.platforms    = { :ios => '13.0' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.public_header_files = 'ios/**/*.h'

  flipper_defs = [
    "FLIPPER_DEBUG_ONLY=#{flipper_debug_only ? 1 : 0}",
    "FLIPPER_ENABLED=#{flipper_enabled ? 1 : 0}",
  ]

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
