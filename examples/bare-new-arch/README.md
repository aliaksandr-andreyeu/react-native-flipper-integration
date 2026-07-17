# bare-new-arch — reference example

Bare React Native (RN 0.85), **New Architecture** enabled natively (`newArchEnabled=true`), autolinking `react-native-flipper-kit` from the repo root (`file:../..`). It demonstrates every Flipper plugin the module enables.

> Use **Flipper Desktop 0.239.0** (the last Electron build with full RN plugin support).

> **Not all plugins work on iOS.** FlipperKit has no equivalent for **Database**, **LeakCanary**, or **Crash Reporter**, so those are **Android-only** (they appear under "Unavailable" in Flipper on iOS, and are disabled in this demo on iOS). **AsyncStorage** also runs on iOS but is **not visible in any Flipper plugin** there (it is file-based, not SQLite). **Network, Layout, SharedPreferences/UserDefaults, and Logs** work on both platforms. See the per-card notes and the capability matrix in the [library README](../../README.md).

## Setup & run

```bash
# from repo root
npm install

cd examples/bare-new-arch
npm install
# iOS
cd ios && pod install && cd ..
npx react-native run-ios
# Android
npx react-native run-android
```

The architecture is pinned in `android/gradle.properties` (`newArchEnabled=true`) and the iOS project — it is **not** a runtime toggle.

## What each card demonstrates

| Card | Flipper plugin | How it works | Caveats |
| --- | --- | --- | --- |
| Status & init | — | Auto-init on module creation (Android) / app launch (iOS). The button calls the idempotent `initializeFlipper()` — the explicit entry point when `FLIPPER_AUTO_INIT=false` (as this example is configured). | — |
| Network | **Network** | `fetch()` to `dummyjson.com` — GET, POST, `/http/404`, `/http/500`, and a `?delay=1500` slow request, so the plugin shows methods, 2xx/4xx/5xx status colors and timing. The module installs the OkHttp interceptor (Android) / `SKIOSNetworkAdapter` (iOS). | — |
| Database | **Databases** | `op-sqlite` opens `demo.db` and runs SQL. On Android it opens in `ANDROID_DATABASE_PATH` so Flipper's `context.databaseList()` scan finds it. | Android only — FlipperKit ships no usable iOS DB plugin. |
| AsyncStorage | **Databases** | On Android, AsyncStorage is the SQLite DB `RKStorage`, listed automatically. | iOS AsyncStorage is file-based (not in the DB plugin). |
| SharedPreferences / UserDefaults | **SharedPreferences** (Android) / **UserDefaults** (iOS) | `react-native-default-preference`. On Android the prefs file name is set to the app package so it matches the single-arg `SharedPreferencesFlipperPlugin(context)` the module registers; on iOS it uses standard `NSUserDefaults`. | If Android values don't show, confirm the prefs name matches the package. |
| Logs | **Logs** | `console.log/warn/error`. Desktop reads `adb logcat` (`ReactNativeJS`) / iOS device console. | No device-side plugin — works with zero wiring. |
| Crash & Leak | **Crash Reporter** / **LeakCanary** | Native `DemoTools` module: `crashNative()` throws on a background thread (reaches the module's uncaught handler → Crash Reporter, then crashes); `triggerLeak()` retains an object and registers it with LeakCanary's watcher. | **Android only.** FlipperKit has no iOS crash/leak plugin; on iOS the crash button only throws in JS. |
| Layout | **Layout** | The view tree itself; no action. | — |

## Native `DemoTools` (example-only)

`android/app/src/main/java/.../DemoToolsModule.kt` exists purely to demonstrate the Crash and LeakCanary plugins, which a JS-only app cannot trigger (a JS `throw` is caught by RN and never reaches the native uncaught handler; LeakCanary only watches native objects). It uses reflection to reach `leakcanary.AppWatcher`, so it needs no compile-time LeakCanary dependency (LeakCanary is on the app's debug runtime classpath, pulled in transitively by the library).

It is a legacy `ReactPackage` registered in `MainApplication.kt`; the New Architecture interop layer exposes it to the bridgeless runtime. There is no iOS counterpart by design.

## Notes

- Pressing **Force crash** terminates the app (after reporting to Flipper) — expected.
- All demo actions are wrapped so a missing native link surfaces as an inline error string rather than crashing the demo.
