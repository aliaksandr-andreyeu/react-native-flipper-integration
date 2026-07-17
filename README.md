# react-native-flipper-kit

Configurable Flipper integration for React Native. Supports **Old Architecture** (Native Modules) and **New Architecture** (Turbo Modules / codegen).

> **Note:** Meta has placed Flipper in maintenance mode. This package targets teams that still use **[Flipper Desktop 0.239.0](https://github.com/facebook/flipper/releases/tag/v0.239.0)** with React Native. For greenfield projects, consider React DevTools, Xcode Instruments, and Android Studio profilers.

## Tested & verified

This module is actively used with **Flipper Desktop 0.239.0** (Electron **50.0.0**) - the **November 2023** release and the **last Electron build** with full React Native debugging support (Layout, Network, React DevTools, Hermes Debugger). **Everything works as expected** with this setup on React Native 0.85.

> Flipper 0.239.0 is the recommended desktop version for React Native projects. Later Flipper releases removed Electron artifacts and reduced RN plugin support.

---

## Requirements

| Component                  | Version                                                |
| -------------------------- | ------------------------------------------------------ |
| React Native               | ≥ 0.74 (tested on 0.85)                                |
| Flipper Desktop            | **0.239.0** (Electron **50.0.0**, Nov 2023) - verified |
| Android Flipper SDK        | `0.273.0` (default, override with `FLIPPER_VERSION`)   |
| iOS FlipperKit (CocoaPods) | `0.252.0` (default, override with `FLIPPER_VERSION`)   |
| Node.js                    | ≥ 20 to consume; development pins 24 (`.nvmrc`)        |

> **Desktop ↔ SDK:** Flipper Desktop **0.239.0** works with the native SDK versions bundled in this module. CocoaPods does not publish FlipperKit `0.273.0` for iOS - the latest available `0.252.0` is used instead.

---

## Installation

### 1. Add the dependency

**Local path (monorepo / boilerplate):**

```bash
npm install ./react-native-flipper-kit
```

**From npm (if published):**

```bash
npm install react-native-flipper-kit
```

Autolinking wires up the module automatically - no manual `Package` / `pod` registration required.

### 2. Android

Add to the app's `android/gradle.properties`:

```properties
FLIPPER_DEBUG_ONLY=true
```

Optional SDK override in the app root `android/build.gradle` or `gradle.properties`:

```properties
FLIPPER_VERSION=0.273.0
```

Rebuild the app after any native config change.

### 3. iOS

```bash
cd ios && pod install && cd ..
```

For Flipper in iOS Release builds:

```bash
FLIPPER_DEBUG_ONLY=false pod install
```

Optional SDK override:

```bash
FLIPPER_VERSION=0.252.0 pod install
```

> **Xcode 16 / macOS Sequoia build error** — `static assertion failed … std::is_trivial<folly::detail::AccessSpreaderBase::GlobalState>`. `Flipper-Folly 2.6.x` (pulled in by FlipperKit) predates folly's switch from `is_trivial` to `is_trivially_destructible`, and the type is no longer "trivial" under the C++20 toolchain. Patch the pinned header from your **Podfile `post_install`** (it is regenerated on every `pod install`):
>
> ```ruby
> post_install do |installer|
>   react_native_post_install(installer, config[:reactNativePath], :mac_catalyst_enabled => false)
>
>   cache_locality = File.join(installer.sandbox.root, 'Flipper-Folly', 'folly', 'concurrency', 'CacheLocality.h')
>   if File.exist?(cache_locality)
>     text = File.read(cache_locality)
>     patched = text.gsub('std::is_trivial<GlobalState>::value', 'std::is_trivially_destructible<GlobalState>::value')
>     File.write(cache_locality, patched) if patched != text
>   end
> end
> ```
>
> The example apps already include this. It mirrors folly's own upstream fix and is a no-op once patched.

> **Xcode 16 `Sandbox: rsync … deny … _CodeSignature`** when embedding pod frameworks — Xcode 16 defaults **User Script Sandboxing** to `YES`, which blocks the `[CP] Embed Pods Frameworks` phase. Set **`ENABLE_USER_SCRIPT_SANDBOXING = NO`** on the app target (Build Settings → "User Script Sandboxing" → No). The example apps already have this.

### 4. Flipper Desktop

1. Download [Flipper 0.239.0](https://github.com/facebook/flipper/releases/tag/v0.239.0)
2. Launch Flipper Desktop
3. Run the app in Debug mode

**Android - port forwarding:**

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8097 tcp:8097
```

### 5. Expo (prebuild)

```js
// app.config.js
export default {
  plugins: [['react-native-flipper-kit', { flipperDebugOnly: true }]]
};
```

Requires `@expo/config-plugins` (optional peer dependency).

**`expo doctor` / Metro:** use `expo/metro-config`, not `@react-native/metro-config`. Align SDK packages with `npx expo install --check`.

```js
// metro.config.js (Expo SDK 54+)
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Only when the library is linked from a monorepo (file:..), not for npm/GitHub installs:
const workspaceRoot = path.resolve(projectRoot, '..');
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];

module.exports = config;
```

```bash
npx expo install --check
npx expo install expo expo-dev-client expo-file-system expo-font expo-linking expo-router @sentry/react-native
```

---

## `FLIPPER_DEBUG_ONLY` configuration

Set at **native build time**, not at JS runtime.

| Value                           | Behavior                                     |
| ------------------------------- | -------------------------------------------- |
| `true` or **not set** (default) | Flipper runs in **Debug builds only**        |
| `false`                         | Flipper runs in **Debug and Release builds** |

### Disable Flipper entirely

```bash
NO_FLIPPER=1 pod install        # iOS
# Android: NO_FLIPPER=1 in gradle.properties or:
NO_FLIPPER=1 ./gradlew assembleDebug
```

When `NO_FLIPPER=1`, native builds use a no-op delegate - no Flipper SDK on the classpath.

### Android - override from CLI

```bash
./gradlew assembleDebug -PFLIPPER_DEBUG_ONLY=false
./gradlew assembleRelease -PFLIPPER_DEBUG_ONLY=false
```

### iOS - override at pod install

```bash
FLIPPER_DEBUG_ONLY=false pod install
```

---

## Usage

### Auto-initialization (recommended)

Flipper starts **automatically** when the app launches:

- **Android** - when the `ReactNativeFlipperKit` native module is created (idempotent)
- **iOS** - via `UIApplicationDidFinishLaunchingNotification` (observer removed after first fire)

No extra code in `AppDelegate` / `MainApplication` is **required**.

### Manual initialization (`FLIPPER_AUTO_INIT=false`)

Set the build flag **`FLIPPER_AUTO_INIT=false`** to disable auto-start and drive init from JS instead — useful to control _when_ Flipper starts (after user consent, a remote flag, choosing an environment). The native side then does nothing until you call `initializeFlipper()`:

```ts
import { initializeFlipper } from 'react-native-flipper-kit';

// e.g. once you've decided Flipper should run
initializeFlipper(); // idempotent
```

Configure it the same way as the other flags:

```properties
# Android — android/gradle.properties (or -PFLIPPER_AUTO_INIT=false)
FLIPPER_AUTO_INIT=false
```

```bash
# iOS
FLIPPER_AUTO_INIT=false pod install
```

```js
// Expo — app config plugin
plugins: [['react-native-flipper-kit', { flipperAutoInit: false }]];
```

> On Android with the New Architecture, calling `initializeFlipper()` also guarantees the native TurboModule is constructed (it is created lazily, so an app that never touches the JS API would otherwise never start Flipper).

### JavaScript / TypeScript API

```typescript
import { isFlipperEnabled, isFlipperDebugOnly } from 'react-native-flipper-kit';

if (isFlipperEnabled()) {
  console.log('Flipper is available');
}

console.log('Debug only:', isFlipperDebugOnly());
```

> **`isFlipperDebugOnly()` reflects the build-time `FLIPPER_DEBUG_ONLY` flag, not the runtime state.** It is independent of `isFlipperEnabled()` — with `NO_FLIPPER=1` you can see `enabled: false` while `debugOnly: true`. Use `isFlipperEnabled()` to gate behavior.

> **`initializeFlipper()`** is idempotent. With the default auto-init it is redundant (and if you call it, do so from an effect, not during render). With **`FLIPPER_AUTO_INIT=false`** it is the explicit entry point — see [Manual initialization](#manual-initialization-flipper_auto_init false) above.

Old Architecture uses `NativeModules` fallback; New Architecture uses the codegen Turbo Module (`TurboModuleRegistry.get`, not `getEnforcing`).

### Custom Flipper plugins (native)

Register **before** the first Flipper start (early `Application` / `AppDelegate`):

**Android (Kotlin):**

```kotlin
import dev.cycleport.flipperkit.ReactNativeFlipperKit
import com.facebook.flipper.android.AndroidFlipperClient

ReactNativeFlipperKit.addPluginInitializer { client ->
  client as AndroidFlipperClient
  client.addPlugin(MyFlipperPlugin())
}
```

**iOS (Objective-C):**

```objc
#import "ReactNativeFlipperKitConfig.h"

ReactNativeFlipperKitRegisterPluginSetup(^(id client) {
  FlipperClient *flipperClient = (FlipperClient *)client;
  [flipperClient addPlugin:[[MyFlipperPlugin alloc] init]];
});
```

See [`ios/ReactNativeFlipperKitConfig.h`](ios/ReactNativeFlipperKitConfig.h) and `ReactNativeFlipperKit.addPluginInitializer` (Android) for the native registration hooks.

---

## Included out of the box

| Plugin                           | Android | iOS             |
| -------------------------------- | ------- | --------------- |
| Layout Inspector                 | Yes     | Yes             |
| Network (OkHttp / NSURL)         | Yes     | Yes             |
| SharedPreferences / UserDefaults | Yes     | Yes             |
| Databases (SQLite)               | Yes     | No              |
| React DevTools plugin            | No      | Yes             |
| LeakCanary (memory leaks)        | Yes     | No              |
| Crash Reporter                   | Yes     | No              |
| Logs                             | logcat¹ | device console¹ |

> ¹ **Logs** is not a device-side plugin — Flipper Desktop reads `adb logcat` (Android) and the iOS device console directly, so any `Log.*` / `os_log` / `console.*` output appears in the Logs tab with no module wiring. **Crash Reporter** on Android is wired in the module (a global uncaught-exception handler forwards crashes to the `CrashReporter` tab); FlipperKit ships no iOS crash plugin, so on iOS a forced crash surfaces in Xcode/console only.

> **Databases / SharedPreferences (Android):** both ship in the core Flipper artifact (no extra dependency). Databases auto-discovers the app's SQLite files; SharedPreferences inspects the default prefs file (named after the package). To expose additional prefs files or custom DB drivers, register your own plugin instance via `addPluginInitializer`.

> **LeakCanary (Android):** bundles `com.squareup.leakcanary:leakcanary-android` (debug-only by default) and the Flipper `flipper-leakcanary2-plugin`. LeakCanary auto-installs via its own `ContentProvider` and detects leaks on its own; the module registers a `FlipperLeakEventListener` that forwards each completed heap analysis to the Flipper "LeakCanary" tab. Override the LeakCanary version with the `LEAKCANARY_VERSION` Gradle property.

> **Android network plugin limitation:** to capture traffic, the module calls `NetworkingModule.setCustomClientBuilder` (debug builds only). This is a global hook — if your app or another library already sets a custom OkHttp client builder, registering Flipper will replace it. If you need your own builder, add the Flipper interceptor inside it yourself instead of relying on the default integration.

> **Expo apps:** the Network plugin captures nothing under Expo's default `expo/fetch`, which bypasses `NetworkingModule`. Set `EXPO_PUBLIC_USE_RN_FETCH=1` to keep React Native's `fetch` — see [Troubleshooting → Expo: Network plugin stays empty](#expo-network-plugin-stays-empty-requests-succeed-nothing-shows).

> **iOS requires the New Architecture.** On the Old Architecture, linking FlipperKit breaks the iOS Paper bridge at runtime (white screen or SIGABRT in debug builds) due to an ABI conflict between FlipperKit's frozen `Flipper-Folly` and React Native's `RCT-Folly`. On old-arch iOS set `NO_FLIPPER=1` (Android is unaffected either way) — see [Troubleshooting → Old Architecture + iOS](#old-architecture--ios-white-screen-or-sigabrt-on-launch-debug-builds).

---

## React Native architecture support

| Mode             | Implementation                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| Old Architecture | `NativeModules.ReactNativeFlipperKit` (JS fallback)                         |
| New Architecture | Turbo Module via `NativeReactNativeFlipperKitSpec` + `getTurboModule` (iOS) |

Android module extends generated `NativeReactNativeFlipperKitSpec`. iOS implements `NativeReactNativeFlipperKitSpec` when codegen headers are present.

---

## Module structure

```
react-native-flipper-kit/
├── src/
│   ├── index.ts
│   └── NativeReactNativeFlipperKit.ts  # codegen spec
├── android/                            # package dev.cycleport.flipperkit
│   ├── build.gradle
│   ├── consumer-rules.pro
│   └── src/
│       ├── main/
│       ├── flipper/                    # real Flipper (debug or all variants)
│       └── release/                    # no-op (NO_FLIPPER / debug-only release)
├── ios/
│   ├── ReactNativeFlipperKit.mm           # Bridge + Turbo Module
│   ├── ReactNativeFlipperKitConfig.*      # plugins + extension hooks
│   └── ReactNativeFlipperKitInitializer.mm
├── examples/                           # sample apps (bare/Expo × old/new arch)
│   ├── bare-new-arch/                  # bare RN, New Architecture (reference)
│   ├── bare-old-arch/                  # bare RN, Old Architecture
│   ├── expo-new-arch/                  # Expo, New Architecture
│   └── expo-old-arch/                  # Expo, Old Architecture
├── app.plugin.js                       # Expo config plugin
└── ReactNativeFlipperKit.podspec
```

---

## Development

```bash
npm install          # sets up husky pre-commit hook
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm run typecheck    # TypeScript
npm test             # Jest unit tests
npm run test:coverage
```

**Unit tests (Jest):** JS API (`src/index.ts`) - Turbo Module / NativeModules fallback / linking error; Expo plugin (`app.plugin.js`) - `FLIPPER_DEBUG_ONLY` and `NO_FLIPPER`.

Pre-commit runs **lint-staged**: ESLint fix + Prettier on staged `*.{js,ts,tsx}` and Prettier on `*.{json,md,yml}`.

---

## Example apps (Android / iOS)

Four sample apps live under [`examples/`](examples/), each autolinking `react-native-flipper-kit` and demonstrating every plugin. The architecture is pinned **natively** in each app (not toggled at runtime):

| App                                       | Framework | Architecture     |
| ----------------------------------------- | --------- | ---------------- |
| [`bare-new-arch`](examples/bare-new-arch) | bare RN   | New Architecture |
| `bare-old-arch`                           | bare RN   | Old Architecture |
| `expo-new-arch`                           | Expo      | New Architecture |
| `expo-old-arch`                           | Expo      | Old Architecture |

The root `npm run example:*` scripts target `bare-new-arch` (the reference app):

```bash
# From repo root
npm install
cd examples/bare-new-arch && npm install

# Android
npm run example:android
# or: cd examples/bare-new-arch && npm run android

# iOS
cd examples/bare-new-arch/ios && pod install && cd .. && npm run ios
```

| Script (root)                   | Description                                                        |
| ------------------------------- | ------------------------------------------------------------------ |
| `npm run example`               | Start Metro for the reference app                                  |
| `npm run example:android`       | Run on Android device/emulator                                     |
| `npm run example:ios`           | Run on iOS simulator                                               |
| `npm run example:android:build` | Assemble Debug APK                                                 |
| `npm run example:e2e`           | Maestro smoke (requires [Maestro CLI](https://maestro.mobile.dev)) |

### E2E (Maestro)

Flows live in `examples/bare-new-arch/.maestro/`. Local run (Metro + installed app):

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
cd examples/bare-new-arch && npm start &
adb reverse tcp:8081 tcp:8081
npm run android
maestro test .maestro
```

CI: **Example Android Build** and **Example iOS Build** (`NO_FLIPPER=1`).

---

## Troubleshooting

### App does not appear in Flipper Desktop

1. Run a **Debug** build when `FLIPPER_DEBUG_ONLY=true`
2. Use Flipper Desktop **0.239.0**
3. Android: `adb reverse tcp:8097 tcp:8097`
4. **Clean rebuild** after `pod install` / `gradle.properties` changes

### Expo: Network plugin stays empty (requests succeed, nothing shows)

**Symptom:** every other plugin works, `fetch()` calls complete without errors, but Flipper's **Network** tab shows no traffic. Only affects **Expo** apps — bare React Native is unaffected.

**Cause:** Flipper's Network plugin captures traffic by installing an OkHttp interceptor via React Native's `NetworkingModule.setCustomClientBuilder(...)` (RN applies it per-request, so init timing is irrelevant). Expo's WinterCG runtime, however, **replaces `global.fetch` with [`expo/fetch`](https://docs.expo.dev/versions/latest/sdk/expo/#expofetch)** — a separate native networking client that **bypasses `NetworkingModule` entirely**. The interceptor never sees those requests, so the tab stays empty even though the requests succeed. (`XMLHttpRequest` is _not_ replaced, only `fetch`.)

**Fix:** opt out of the `fetch` override so `global.fetch` stays React Native's `whatwg-fetch` (which flows through `NetworkingModule`). Set the environment variable **`EXPO_PUBLIC_USE_RN_FETCH=1`** for the Metro bundler process:

```jsonc
// package.json — the flag must be present when Metro bundles (EXPO_PUBLIC_* is inlined at build time)
"scripts": {
  "start": "EXPO_PUBLIC_USE_RN_FETCH=1 expo start",
  "android": "EXPO_PUBLIC_USE_RN_FETCH=1 expo run:android",
  "ios": "EXPO_PUBLIC_USE_RN_FETCH=1 expo run:ios"
}
```

or, equivalently, add `EXPO_PUBLIC_USE_RN_FETCH=1` to the project's `.env`. Because the flag is inlined into the JS bundle, restart Metro with a cleared cache (`expo start --clear`) after setting it — **no native rebuild is required**. Expo gates the override on this flag in `node_modules/expo/src/winter/runtime.native.ts` (`if (!useRnFetch) install('fetch', …)`).

> This is a general gotcha for any network debugger that hooks `NetworkingModule` (Flipper, Reactotron, Chrome network inspector): under Expo's default `expo/fetch` they see nothing until `EXPO_PUBLIC_USE_RN_FETCH=1` is set. See [`examples/expo-new-arch`](examples/expo-new-arch), which ships with the flag wired into its scripts.

### Old Architecture + iOS: white screen or SIGABRT on launch (debug builds)

On the **Old Architecture on iOS**, a **debug** build with Flipper linked fails at runtime in one of two ways, depending on the RN version:

- **White screen, no error** (seen on RN 0.76 and 0.81): the app registers and "runs", but native module constants arrive in JS as empty objects — `NativeSourceCode.getConstants().scriptURL` is `undefined`, `Platform.constants.reactNativeVersion` is `null`, and the root view never renders.
- **`SIGABRT` shortly after first render** (seen on RN 0.79): React Native's modern **fusebox** JS inspector aborts inside folly:

```
folly::json::serialize → google::LogMessageFatal → abort
folly::toJson(folly::dynamic)
InspectorPackagerConnection::Impl::sendToPackager(folly::dynamic)   ← RN inspector
-[SRWebSocket _handleFrameWithData:opCode:]                          ← FlipperKit's SocketRocket
```

**Root cause (verified):** FlipperKit's frozen C++ deps (`Flipper-Folly` ≈2021 vintage, `Flipper-Glog`, `SocketRocket`) define the same symbols (`folly::`, `google::`, `SRWebSocket`) as React Native's own, much newer copies (`RCT-Folly` 2024.x, `glog`, RN's WebSocket) — a link-time One-Definition-Rule conflict with a **mismatched `folly::dynamic` ABI**. The Old-Architecture Paper bridge marshals constants and messages through `folly::dynamic` (`convertIdToFollyDynamic`), so mixed-ABI dynamics surface as silently-empty `{}` constants (→ white screen) or as a `LOG(FATAL)` in `folly::toJson` (→ SIGABRT). The New Architecture marshals through JSI directly, bypassing `folly::dynamic` on the critical path — which is why New-Arch iOS is unaffected.

**Proof:** rebuilding the same old-arch app with `NO_FLIPPER=1 pod install` (FlipperKit pods removed, everything else identical) renders and works perfectly. Linking the Flipper pods back reintroduces the failure. This affects **any** consumer on old-arch iOS, not just this repo's examples.

It can't be fixed by build-setting/header order (ODR is a link-time issue), `use_frameworks!` doesn't reliably isolate C++ vague-linkage symbols, and `RCTInspectorDevServerHelper.disableDebugger()` is a no-op under fusebox. A real fix requires forking FlipperKit's frozen podspecs to build against `RCT-Folly`. This is exactly why Meta removed Flipper from React Native core in 0.74+.

**Practical guidance:**

- **iOS + Old Architecture: don't link Flipper.** Set `NO_FLIPPER=1` for iOS (`NO_FLIPPER=1 pod install`) — the app runs normally, `isFlipperEnabled()` reports `false`. Keep Flipper on Android (flags are per-platform), where old-arch works fully.
- **Release builds are unaffected** with the default `FLIPPER_DEBUG_ONLY=true` (Flipper pods are only linked into Debug).
- For iOS Flipper debugging, use the **New Architecture** (see `bare-new-arch`, `expo-new-arch` — both verified on iOS).

**Status:** documented limitation for the Old-Architecture iOS examples (`bare-old-arch`, `expo-old-arch`). Old-arch **Android** works fully. See [`examples/expo-old-arch`](examples/expo-old-arch#ios-known-limitation-crash-on-launch) for the crash analysis and [`examples/bare-old-arch`](examples/bare-old-arch) for the `NO_FLIPPER=1` verification.

### iOS: Firebase + modular headers errors

Add modular headers for Firebase pods in the app `Podfile` (see React Native Firebase docs).

### Android: Flipper not linked in Release

Expected when `FLIPPER_DEBUG_ONLY=true` (`debugImplementation`). Set `FLIPPER_DEBUG_ONLY=false` to enable Release.

### JS linking error

- `cd ios && pod install`
- Rebuild native app
- Confirm the package is in `package.json` and autolinked

---

## License

MIT
