package dev.cycleport.flipperkit.example.barenewarch

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Example-only helpers to demonstrate Flipper's Crash Reporter and LeakCanary plugins.
 * These need native code: a JS `throw` is caught by React Native and never reaches the
 * global uncaught-exception handler, and LeakCanary only watches native objects.
 */
class DemoToolsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /**
   * Throw on a background thread so the exception is *uncaught* and reaches the global
   * `Thread.defaultUncaughtExceptionHandler` that react-native-flipper-kit installs to feed
   * Flipper's "Crash Reporter" tab. Then the app crashes as usual (the chained handler runs).
   */
  @ReactMethod
  fun crashNative() {
    Thread {
      throw RuntimeException("Demo crash from DemoTools.crashNative() — see Flipper Crash Reporter")
    }
      .start()
  }

  /**
   * Allocate an object, retain it forever in a static list (a real leak), and hand it to
   * LeakCanary's ObjectWatcher with the expectation that it becomes weakly reachable. Since
   * it never will, LeakCanary reports a retained object → the Flipper LeakCanary tab shows it.
   *
   * Done via reflection so this module compiles without a direct LeakCanary dependency:
   * LeakCanary is on the app's debug runtime classpath (pulled in transitively by the library),
   * so the class resolves at runtime in debug builds and is skipped otherwise.
   */
  @ReactMethod
  fun triggerLeak() {
    val leaked = LeakedThing()
    retained.add(leaked)
    try {
      val appWatcher = Class.forName("leakcanary.AppWatcher")
      val instance = appWatcher.getField("INSTANCE").get(null)
      val objectWatcher = appWatcher.getMethod("getObjectWatcher").invoke(instance)
      objectWatcher.javaClass
        .getMethod("expectWeaklyReachable", Any::class.java, String::class.java)
        .invoke(objectWatcher, leaked, "Demo leak from DemoTools.triggerLeak()")
    } catch (_: Throwable) {
      // LeakCanary not present (e.g. release/NO_FLIPPER). The static retain still leaks;
      // LeakCanary would also catch it through its default watchers when available.
    }
  }

  private class LeakedThing

  private companion object {
    const val NAME = "DemoTools"

    // Intentionally process-lifetime: this is what makes triggerLeak() a real leak.
    val retained = mutableListOf<Any>()
  }
}
