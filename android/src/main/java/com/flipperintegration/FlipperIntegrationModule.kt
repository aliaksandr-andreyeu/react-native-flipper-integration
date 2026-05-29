package com.flipperintegration

import com.facebook.react.bridge.ReactApplicationContext

class FlipperIntegrationModule(
  reactContext: ReactApplicationContext,
) : NativeFlipperIntegrationSpec(reactContext) {

  init {
    FlipperIntegration.initialize(reactApplicationContext.applicationContext)
  }

  override fun isEnabled(): Boolean {
    return FlipperIntegration.shouldEnable(reactApplicationContext.applicationContext)
  }

  override fun isDebugOnly(): Boolean {
    return BuildConfig.FLIPPER_DEBUG_ONLY
  }

  override fun start() {
    FlipperIntegration.initialize(reactApplicationContext.applicationContext)
  }
}
