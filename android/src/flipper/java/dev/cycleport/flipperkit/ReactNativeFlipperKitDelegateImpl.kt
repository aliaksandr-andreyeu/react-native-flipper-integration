package dev.cycleport.flipperkit

import android.content.Context
import android.util.Log
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.android.utils.FlipperUtils
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.plugins.leakcanary2.FlipperLeakEventListener
import com.facebook.flipper.plugins.leakcanary2.LeakCanary2FlipperPlugin
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin
import com.facebook.react.modules.network.NetworkingModule
import java.util.concurrent.atomic.AtomicBoolean
import leakcanary.LeakCanary
import okhttp3.OkHttpClient

class ReactNativeFlipperKitDelegateImpl : ReactNativeFlipperKitDelegate {
  override fun shouldEnable(context: Context): Boolean {
    return FlipperUtils.shouldEnableFlipper(context)
  }

  override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) {
    val client = AndroidFlipperClient.getInstance(context)
    client.addPlugin(InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()))

    val networkPlugin = NetworkFlipperPlugin()
    // This is a GLOBAL hook: it replaces any OkHttp client builder the app or another
    // library already registered (e.g. cert pinning, auth interceptors). Warn so the
    // override is visible in logs rather than silently clobbering networking config.
    Log.w(
      "ReactNativeFlipperKit",
      "Installing a global NetworkingModule OkHttp client builder for the Flipper " +
        "Network plugin. This replaces any previously set custom client builder. If your " +
        "app needs its own builder, add the Flipper interceptor inside it yourself.",
    )
    NetworkingModule.setCustomClientBuilder { builder: OkHttpClient.Builder ->
      builder.addNetworkInterceptor(FlipperOkhttpInterceptor(networkPlugin))
    }
    client.addPlugin(networkPlugin)

    // Databases plugin: auto-discovers the app's SQLite databases via Flipper's default
    // providers (no extra dependency — ships in the core flipper artifact).
    client.addPlugin(DatabasesFlipperPlugin(context))

    // SharedPreferences plugin: the single-arg constructor inspects the default prefs file
    // (named after the package). Apps with other prefs files can register additional ones
    // via addPluginInitializer or by descriptor.
    client.addPlugin(SharedPreferencesFlipperPlugin(context))

    // LeakCanary plugin: LeakCanary detects leaks on its own (auto-installed via its
    // ContentProvider) and FlipperLeakEventListener forwards each completed heap analysis
    // to the plugin registered here. Register the plugin before adding the listener so a
    // leak analysed early still finds the plugin via getInstanceIfInitialized().
    client.addPlugin(LeakCanary2FlipperPlugin())
    LeakCanary.config =
      LeakCanary.config.copy(
        eventListeners = LeakCanary.config.eventListeners + FlipperLeakEventListener(),
      )

    // Crash Reporter plugin: surfaces uncaught exceptions in Flipper's "Crash Reporter" tab.
    // The plugin itself is passive — it needs exceptions pushed to it, so install a global
    // uncaught-exception handler that forwards to the plugin and then delegates to whatever
    // handler was already set (so the app still crashes/reports as before).
    val crashReporter = CrashReporterPlugin.getInstance()
    client.addPlugin(crashReporter)
    installCrashHandler(crashReporter)

    pluginInitializers.forEach { initializer -> initializer(client) }
    client.start()
  }

  private fun installCrashHandler(plugin: CrashReporterPlugin) {
    // Idempotent: a retried initialize() (after a failed start) must not chain a second
    // handler on top of the one we already installed.
    if (!crashHandlerInstalled.compareAndSet(false, true)) {
      return
    }
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      try {
        plugin.sendExceptionMessage(thread, throwable)
      } finally {
        // Preserve existing crash behavior (RN red box / process kill / Crashlytics, etc.).
        previous?.uncaughtException(thread, throwable)
      }
    }
  }

  private companion object {
    val crashHandlerInstalled = AtomicBoolean(false)
  }
}
