package dev.cycleport.flipperkit

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReactNativeFlipperKitTest {

  /** Fake delegate so tests never touch the real Flipper SDK / native libs. */
  private class FakeDelegate(
    private val enabled: Boolean,
    private val failFirstInitialize: Boolean = false,
  ) : ReactNativeFlipperKitDelegate {
    var initializeCount = 0
    var receivedInitializers: List<(Any) -> Unit> = emptyList()

    override fun shouldEnable(context: Context): Boolean = enabled

    override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) {
      initializeCount++
      if (failFirstInitialize && initializeCount == 1) {
        throw RuntimeException("simulated Flipper init failure")
      }
      receivedInitializers = pluginInitializers
    }
  }

  private val context: Context
    get() = ApplicationProvider.getApplicationContext()

  @Test
  fun `shouldEnable reflects the delegate when build flags allow it`() {
    // Debug unit-test variant: FLIPPER_ENABLED=true, FLIPPER_DEBUG_ONLY=true, DEBUG=true
    // → gating passes through to the delegate.
    ReactNativeFlipperKit.resetForTests(FakeDelegate(enabled = true))
    assertTrue(ReactNativeFlipperKit.shouldEnable(context))

    ReactNativeFlipperKit.resetForTests(FakeDelegate(enabled = false))
    assertFalse(ReactNativeFlipperKit.shouldEnable(context))
  }

  @Test
  fun `initialize runs the delegate exactly once across repeated calls`() {
    val delegate = FakeDelegate(enabled = true)
    ReactNativeFlipperKit.resetForTests(delegate)

    ReactNativeFlipperKit.initialize(context)
    ReactNativeFlipperKit.initialize(context)
    ReactNativeFlipperKit.initialize(context)

    assertEquals(1, delegate.initializeCount)
  }

  @Test
  fun `initialize is a no-op when the delegate is disabled`() {
    val delegate = FakeDelegate(enabled = false)
    ReactNativeFlipperKit.resetForTests(delegate)

    ReactNativeFlipperKit.initialize(context)

    assertEquals(0, delegate.initializeCount)
  }

  @Test
  fun `initialize can be retried after the delegate throws`() {
    val delegate = FakeDelegate(enabled = true, failFirstInitialize = true)
    ReactNativeFlipperKit.resetForTests(delegate)

    // First call: delegate throws, the init state must roll back to IDLE.
    ReactNativeFlipperKit.initialize(context)
    // Second call: must run the delegate again and succeed (state was not stuck).
    ReactNativeFlipperKit.initialize(context)

    assertEquals(2, delegate.initializeCount)
  }

  @Test
  fun `registered plugin initializers are forwarded to the delegate`() {
    val delegate = FakeDelegate(enabled = true)
    ReactNativeFlipperKit.resetForTests(delegate)

    ReactNativeFlipperKit.addPluginInitializer {}
    ReactNativeFlipperKit.addPluginInitializer {}
    ReactNativeFlipperKit.initialize(context)

    assertEquals(2, delegate.receivedInitializers.size)
  }
}
