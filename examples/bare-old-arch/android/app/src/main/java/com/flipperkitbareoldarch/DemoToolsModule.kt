package com.flipperkitbareoldarch

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Example-only Crash Reporter / LeakCanary demo helpers (Android). */
class DemoToolsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  @ReactMethod
  fun crashNative() {
    Thread {
          throw RuntimeException("Demo crash from DemoTools.crashNative()")
        }
        .start()
  }

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
      // LeakCanary not on classpath (release / NO_FLIPPER).
    }
  }

  private class LeakedThing

  private companion object {
    const val NAME = "DemoTools"
    val retained = mutableListOf<Any>()
  }
}
