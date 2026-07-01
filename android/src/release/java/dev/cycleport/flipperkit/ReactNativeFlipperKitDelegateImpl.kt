package dev.cycleport.flipperkit

import android.content.Context

class ReactNativeFlipperKitDelegateImpl : ReactNativeFlipperKitDelegate {
  override fun shouldEnable(context: Context): Boolean = false

  override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) = Unit
}
