package com.flipperintegration

import android.content.Context
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

object FlipperIntegration {
  private val initialized = AtomicBoolean(false)
  private val pluginInitializers = CopyOnWriteArrayList<(Any) -> Unit>()

  // Swappable so unit tests can inject a fake delegate without touching the Flipper SDK.
  // Production always uses the source-set-selected FlipperIntegrationDelegateImpl (flipper/release).
  internal var delegate: FlipperIntegrationDelegate = FlipperIntegrationDelegateImpl()

  fun shouldEnable(context: Context): Boolean {
    if (!BuildConfig.FLIPPER_ENABLED) {
      return false
    }

    if (BuildConfig.FLIPPER_DEBUG_ONLY && !BuildConfig.DEBUG) {
      return false
    }

    return delegate.shouldEnable(context)
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

    delegate.initialize(context, pluginInitializers)
  }

  /** Test-only: restore a clean state and swap in a fake delegate. */
  internal fun resetForTests(testDelegate: FlipperIntegrationDelegate) {
    initialized.set(false)
    pluginInitializers.clear()
    delegate = testDelegate
  }
}

interface FlipperIntegrationDelegate {
  fun shouldEnable(context: Context): Boolean
  fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>)
}
