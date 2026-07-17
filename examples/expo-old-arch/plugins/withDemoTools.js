const {
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Example-only Expo config plugin that ships the native `DemoTools` module used by the
 * Crash Reporter / LeakCanary demos — the SAME Kotlin as `examples/bare-new-arch`, just
 * delivered through a plugin so it survives `expo prebuild` (which regenerates `android/`
 * and would otherwise wipe hand-placed native files + MainApplication edits).
 *
 * It (1) writes DemoToolsModule.kt + DemoToolsPackage.kt into the app's package dir, and
 * (2) registers `add(DemoToolsPackage())` in MainApplication's package list.
 */

const demoToolsModuleKt = (pkg) => `package ${pkg}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Example-only helpers to demonstrate Flipper's Crash Reporter and LeakCanary plugins.
 * These need native code: a JS \`throw\` is caught by React Native and never reaches the
 * global uncaught-exception handler, and LeakCanary only watches native objects.
 */
class DemoToolsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /**
   * Throw on a background thread so the exception is *uncaught* and reaches the global
   * \`Thread.defaultUncaughtExceptionHandler\` that react-native-flipper-kit installs to feed
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
`;

const demoToolsPackageKt = (pkg) => `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers [DemoToolsModule]. A legacy [ReactPackage] is fine on the New Architecture —
 * React Native's interop layer exposes legacy native modules to the bridgeless runtime.
 */
class DemoToolsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(DemoToolsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;

function withDemoToolsSources(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const pkg = cfg.android?.package;
      if (!pkg) {
        throw new Error('withDemoTools: android.package is not set in app config');
      }
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...pkg.split('.')
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'DemoToolsModule.kt'),
        demoToolsModuleKt(pkg)
      );
      fs.writeFileSync(
        path.join(javaDir, 'DemoToolsPackage.kt'),
        demoToolsPackageKt(pkg)
      );
      return cfg;
    },
  ]);
}

function withDemoToolsRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    // DemoToolsPackage lives in the same package as MainApplication, so no import is needed.
    const note =
      '// Example-only helper for the Crash Reporter / LeakCanary demos (not autolinked).';
    if (!contents.includes('DemoToolsPackage()')) {
      if (/PackageList\(this\)\.packages\.apply\s*\{/.test(contents)) {
        // New Architecture template (SDK 54+): `PackageList(this).packages.apply { … }`.
        contents = contents.replace(
          /(PackageList\(this\)\.packages\.apply\s*\{)/,
          `$1\n          ${note}\n          add(DemoToolsPackage())`
        );
      } else if (/val\s+packages\s*=\s*PackageList\(this\)\.packages/.test(contents)) {
        // Old Architecture template (e.g. SDK 53): `val packages = PackageList(this).packages`
        // … `return packages`. Add to the mutable list before it's returned.
        contents = contents.replace(
          /(val\s+packages\s*=\s*PackageList\(this\)\.packages)/,
          `$1\n            ${note}\n            packages.add(DemoToolsPackage())`
        );
      } else {
        throw new Error(
          'withDemoTools: could not locate the PackageList in MainApplication to register DemoToolsPackage'
        );
      }
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withDemoTools(config) {
  config = withDemoToolsSources(config);
  config = withDemoToolsRegistration(config);
  return config;
};
