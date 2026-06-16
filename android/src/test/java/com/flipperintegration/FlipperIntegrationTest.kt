package com.flipperintegration

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
class FlipperIntegrationTest {

  /** Fake delegate so tests never touch the real Flipper SDK / native libs. */
  private class FakeDelegate(private val enabled: Boolean) : FlipperIntegrationDelegate {
    var initializeCount = 0
    var receivedInitializers: List<(Any) -> Unit> = emptyList()

    override fun shouldEnable(context: Context): Boolean = enabled

    override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) {
      initializeCount++
      receivedInitializers = pluginInitializers
    }
  }

  private val context: Context
    get() = ApplicationProvider.getApplicationContext()

  @Test
  fun `shouldEnable reflects the delegate when build flags allow it`() {
    // Debug unit-test variant: FLIPPER_ENABLED=true, FLIPPER_DEBUG_ONLY=true, DEBUG=true
    // → gating passes through to the delegate.
    FlipperIntegration.resetForTests(FakeDelegate(enabled = true))
    assertTrue(FlipperIntegration.shouldEnable(context))

    FlipperIntegration.resetForTests(FakeDelegate(enabled = false))
    assertFalse(FlipperIntegration.shouldEnable(context))
  }

  @Test
  fun `initialize runs the delegate exactly once across repeated calls`() {
    val delegate = FakeDelegate(enabled = true)
    FlipperIntegration.resetForTests(delegate)

    FlipperIntegration.initialize(context)
    FlipperIntegration.initialize(context)
    FlipperIntegration.initialize(context)

    assertEquals(1, delegate.initializeCount)
  }

  @Test
  fun `initialize is a no-op when the delegate is disabled`() {
    val delegate = FakeDelegate(enabled = false)
    FlipperIntegration.resetForTests(delegate)

    FlipperIntegration.initialize(context)

    assertEquals(0, delegate.initializeCount)
  }

  @Test
  fun `registered plugin initializers are forwarded to the delegate`() {
    val delegate = FakeDelegate(enabled = true)
    FlipperIntegration.resetForTests(delegate)

    FlipperIntegration.addPluginInitializer {}
    FlipperIntegration.addPluginInitializer {}
    FlipperIntegration.initialize(context)

    assertEquals(2, delegate.receivedInitializers.size)
  }
}
