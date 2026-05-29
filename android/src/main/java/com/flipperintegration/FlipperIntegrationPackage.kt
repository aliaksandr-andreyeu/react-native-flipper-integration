package com.flipperintegration

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class FlipperIntegrationPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name == NativeFlipperIntegrationSpec.NAME) {
      return FlipperIntegrationModule(reactContext)
    }
    return null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        NativeFlipperIntegrationSpec.NAME to
          ReactModuleInfo(
            NativeFlipperIntegrationSpec.NAME,
            NativeFlipperIntegrationSpec.NAME,
            false,
            false,
            false,
            true,
          ),
      )
    }
  }
}
