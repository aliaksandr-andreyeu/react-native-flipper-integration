# FlipperKit Expo example (Old Architecture)

Expo SDK 53 / React Native 0.79, **Legacy (Old) Architecture** (`newArchEnabled: false`), integrating
[`react-native-flipper-kit`](../..). SDK 53 is one of the last Expo SDKs where the old architecture can
be enabled (it is removed in SDK 55+). Init is manual (`flipperAutoInit: false`) — press **Run** in the app.

Start it with the project scripts (`npm run android` / `npm run start`), **not** raw `npx expo …`,
so the Expo-specific workarounds below are applied.

## Platform support

| Platform | Status |
| --- | --- |
| **Android** | ✅ Fully working — all plugins (Network, Databases, SharedPreferences, LeakCanary, Crash Reporter, Logs, Layout). |
| **iOS** | ❌ **Known limitation** — crashes on launch. See [below](#ios-known-limitation-crash-on-launch). iOS is fully demonstrated by the two New-Architecture examples instead. |

## iOS: known limitation (crash on launch)

On iOS this example **builds and briefly renders the first screen, then crashes with `SIGABRT`** within
~0.5s. This is a limitation of running FlipperKit's frozen C++ dependencies against React Native's modern
JS inspector on the Old Architecture — **not** a bug in `react-native-flipper-kit` or in the app code.

**Root cause — dual-folly ODR conflict in the fusebox inspector.** FlipperKit bundles its own frozen C++
libs (`Flipper-Folly`, `Flipper-Glog`, `SocketRocket`) whose symbols live in the same namespaces
(`folly::`, `google::`, `SRWebSocket`) as React Native's own copies (`RCT-Folly`, `glog`, RN's WebSocket).
Linking both into one binary is a One-Definition-Rule violation; the linker keeps one definition per symbol.
On RN 0.79's Old Architecture, RN's modern **fusebox** JS inspector (`InspectorPackagerConnection`) ends up
calling **FlipperKit's** `folly::toJson` — which has a different `folly::dynamic` ABI — so it hits a
`LOG(FATAL)` in folly's JSON printer and aborts. The crash stack shows RN's inspector using `SRWebSocket`
(SocketRocket) and `FB.Flipper.Glog`, which should not be in that path:

```
folly::json::serialize(...)  →  google::LogMessageFatal  →  abort   (json.cpp:149, logging.cc:1474)
folly::toJson(folly::dynamic const&)
facebook::react::jsinspector_modern::InspectorPackagerConnection::Impl::sendToPackager(folly::dynamic)
facebook::react::jsinspector_modern::InspectorPackagerConnection::Impl::didReceiveMessage(...)
-[RCTCxxInspectorWebSocketAdapter webSocket:didReceiveMessageWithString:]
-[SRWebSocket _handleFrameWithData:opCode:]           ← FlipperKit's SocketRocket
Abort trap: 6 (SIGABRT), thread com.apple.main-thread
```

**Why it does not affect the New-Architecture examples:** the New Architecture marshals through JSI
directly, bypassing `folly::dynamic` on the critical path. Both `bare-new-arch` and `expo-new-arch` run
on iOS.

**The same root cause was later PROVEN with `bare-old-arch` (RN 0.76):** there the conflict manifests as
a silent **white screen** (Paper marshals constants through `folly::dynamic`, and mixed-ABI dynamics come
out as empty `{}`). Rebuilding that app with `NO_FLIPPER=1 pod install` — FlipperKit pods removed,
everything else identical — renders and works perfectly. So all three old-arch iOS failures (RN 0.76
white screen, RN 0.79 inspector SIGABRT, RN 0.81 white screen) share this one root, and it affects any
old-arch iOS consumer, not just this repo.

**Why it can't be fixed cleanly here:**
- `RCTInspectorDevServerHelper.disableDebugger()` is a **no-op under fusebox** (RN 0.79 default), so the
  inspector can't be turned off that way.
- There is no env/`Info.plist` flag to disable fusebox; only the C++ `InspectorFlags::dangerouslyDisableFuseboxForTest()`, which requires a native ObjC++ shim wired in before RN starts.
- The ODR conflict is a **link-time** issue — it can't be fixed by header-search-path order or `use_frameworks!` (C++ symbols aren't namespaced per framework).
- A true "dedupe folly" fix means **forking FlipperKit's frozen podspecs** to build against `RCT-Folly` — out of scope, and it risks breaking the working New-Arch iOS builds.

This is the same class of FlipperKit-frozen-deps-vs-iOS limitation that makes `bare-old-arch` iOS a
documented limitation, and it is why Meta removed Flipper from React Native core in 0.74+. The
`withFlipperFollyFix` config plugin here still fixes the earlier Xcode 16 build errors (Flipper-Folly
`is_trivial`, fmt `consteval`, dual-boost) so the project **compiles** — it just cannot run the inspector
on Old-Arch iOS.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
