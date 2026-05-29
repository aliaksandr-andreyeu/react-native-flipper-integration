package com.flipperintegration

import android.content.Context

class FlipperIntegrationDelegateImpl : FlipperIntegrationDelegate {
  override fun shouldEnable(context: Context): Boolean = false

  override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) = Unit
}
