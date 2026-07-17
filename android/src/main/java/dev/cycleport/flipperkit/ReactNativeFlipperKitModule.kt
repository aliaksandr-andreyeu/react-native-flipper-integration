package dev.cycleport.flipperkit

import com.facebook.react.bridge.ReactApplicationContext

class ReactNativeFlipperKitModule(
  reactContext: ReactApplicationContext,
) : NativeReactNativeFlipperKitSpec(reactContext) {

  init {
    // Auto-init on module creation — unless FLIPPER_AUTO_INIT is off, in which case the app
    // must trigger it explicitly via initializeFlipper() (JS) → start().
    if (BuildConfig.FLIPPER_AUTO_INIT) {
      ReactNativeFlipperKit.initialize(reactApplicationContext.applicationContext)
    }
  }

  override fun isEnabled(): Boolean {
    return ReactNativeFlipperKit.shouldEnable(reactApplicationContext.applicationContext)
  }

  override fun isDebugOnly(): Boolean {
    return BuildConfig.FLIPPER_DEBUG_ONLY
  }

  override fun start() {
    ReactNativeFlipperKit.initialize(reactApplicationContext.applicationContext)
  }
}
