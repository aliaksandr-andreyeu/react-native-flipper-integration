package com.flipperintegration

import android.content.Context
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

object FlipperIntegration {
  private val initialized = AtomicBoolean(false)
  private val pluginInitializers = CopyOnWriteArrayList<(Any) -> Unit>()

  fun shouldEnable(context: Context): Boolean {
    if (!BuildConfig.FLIPPER_ENABLED) {
      return false
    }

    if (BuildConfig.FLIPPER_DEBUG_ONLY && !BuildConfig.DEBUG) {
      return false
    }

    return FlipperIntegrationDelegate.shouldEnable(context)
  }

  /**
   * Register a custom Flipper plugin before the client starts.
   * The client instance type is [com.facebook.flipper.android.AndroidFlipperClient]
   * when Flipper SDK is linked.
   */
  fun addPluginInitializer(initializer: (Any) -> Unit) {
    pluginInitializers.add(initializer)
  }

  fun initialize(context: Context) {
    if (!shouldEnable(context)) {
      return
    }

    if (!initialized.compareAndSet(false, true)) {
      return
    }

    FlipperIntegrationDelegate.initialize(context, pluginInitializers)
  }
}

interface FlipperIntegrationDelegate {
  fun shouldEnable(context: Context): Boolean
  fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>)

  companion object {
    private val instance: FlipperIntegrationDelegate by lazy {
      FlipperIntegrationDelegateImpl()
    }

    fun shouldEnable(context: Context): Boolean = instance.shouldEnable(context)

    fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) {
      instance.initialize(context, pluginInitializers)
    }
  }
}
