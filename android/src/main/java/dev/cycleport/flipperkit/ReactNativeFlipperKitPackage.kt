package dev.cycleport.flipperkit

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ReactNativeFlipperKitPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name == NativeReactNativeFlipperKitSpec.NAME) {
      return ReactNativeFlipperKitModule(reactContext)
    }
    return null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        NativeReactNativeFlipperKitSpec.NAME to
          ReactModuleInfo(
            NativeReactNativeFlipperKitSpec.NAME,
            NativeReactNativeFlipperKitSpec.NAME,
            false,
            false,
            false,
            true,
          ),
      )
    }
  }
}
