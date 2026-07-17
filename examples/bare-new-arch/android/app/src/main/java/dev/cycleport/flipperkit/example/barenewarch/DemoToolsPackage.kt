package dev.cycleport.flipperkit.example.barenewarch

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers [DemoToolsModule]. A legacy [ReactPackage] is fine on the New Architecture —
 * React Native's interop layer exposes legacy native modules to the bridgeless runtime.
 */
class DemoToolsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(DemoToolsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
