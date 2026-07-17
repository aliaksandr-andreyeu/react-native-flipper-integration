package dev.cycleport.flipperkit

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicReference

object ReactNativeFlipperKit {
  private const val TAG = "ReactNativeFlipperKit"

  private enum class InitState {
    IDLE,
    IN_PROGRESS,
    DONE,
  }

  private val initState = AtomicReference(InitState.IDLE)
  private val pluginInitializers = CopyOnWriteArrayList<(Any) -> Unit>()

  // Swappable so unit tests can inject a fake delegate without touching the Flipper SDK.
  // Production always uses the source-set-selected ReactNativeFlipperKitDelegateImpl (flipper/release).
  internal var delegate: ReactNativeFlipperKitDelegate = ReactNativeFlipperKitDelegateImpl()

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

    // Claim the single-initializer slot. IDLE -> IN_PROGRESS guarantees exactly one
    // caller runs the delegate, even off the main thread (the delegate start is posted
    // to main below). Any concurrent or repeat call sees IN_PROGRESS/DONE and bails.
    if (!initState.compareAndSet(InitState.IDLE, InitState.IN_PROGRESS)) {
      return
    }

    // The delegate touches the Flipper SDK and the global NetworkingModule OkHttp
    // builder. On the New Architecture the native module is constructed lazily and
    // not guaranteed to be on the main thread, so pin the actual start to the main
    // thread (run inline when already there to keep behavior synchronous, e.g. tests).
    val appContext = context.applicationContext
    runOnMainThread {
      try {
        delegate.initialize(appContext, pluginInitializers)
        // Mark DONE only after a successful start so a failed init can be retried.
        initState.set(InitState.DONE)
      } catch (t: Throwable) {
        // Roll back so a later initialize() can try again instead of being stuck.
        initState.set(InitState.IDLE)
        Log.w(TAG, "Flipper initialization failed; will retry on the next initialize()", t)
      }
    }
  }

  private inline fun runOnMainThread(crossinline action: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action()
    } else {
      Handler(Looper.getMainLooper()).post { action() }
    }
  }

  /** Test-only: restore a clean state and swap in a fake delegate. */
  internal fun resetForTests(testDelegate: ReactNativeFlipperKitDelegate) {
    initState.set(InitState.IDLE)
    pluginInitializers.clear()
    delegate = testDelegate
  }
}

interface ReactNativeFlipperKitDelegate {
  fun shouldEnable(context: Context): Boolean
  fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>)
}
