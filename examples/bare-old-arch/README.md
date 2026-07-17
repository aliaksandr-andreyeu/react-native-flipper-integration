# bare-old-arch — Old Architecture example (RN 0.76)

Bare React Native **0.76.9** with **Old Architecture** (`newArchEnabled=false` / `RCT_NEW_ARCH_ENABLED=0`).

> **History:** this example started as `bare-old-arch2` — a second attempt on an older Paper bridge after
> the original `bare-old-arch` (RN 0.81.6) hit the same iOS wall. Once the root cause was proven here (see
> below), the RN 0.81 variant was removed and this one took the `bare-old-arch` name. Its investigation
> record is preserved in [`legacy-rn081-investigation/`](legacy-rn081-investigation/). The native project
> was fully renamed to `FlipperKitBareOldArch` (Xcode project/targets/scheme) — no traces of the `2`
> suffix remain. The installed app ids follow the shared example scheme:
> `dev.cycleport.flipperkit.example.bareoldarch` (Android `applicationId` + iOS bundle id); the Android
> `namespace` stays `com.flipperkitbareoldarch` because it is tied to the Kotlin source packages.
>
> **iOS default is `NO_FLIPPER=0`** (Flipper linked) — i.e. the known-broken configuration, kept on
> purpose so the limitation stays reproducible. For a working old-arch iOS app run
> `NO_FLIPPER=1 pod install`.

## ⚠ iOS root cause — FOUND & VERIFIED (2026-07-04)

The iOS white screen on the Old Architecture is caused by **linking FlipperKit itself**, not by the
monorepo `file:../..` setup and not by RN 0.76/0.81.

**Verified experimentally on this app:** rebuilding with FlipperKit pods removed —

```bash
cd ios && NO_FLIPPER=1 pod install && cd .. && npm run ios
```

— renders and works **perfectly** (all cards, navigation, network; `isFlipperEnabled()` correctly
reports `false`). Re-linking the Flipper pods brings the white screen back.

**Mechanism:** FlipperKit's frozen `Flipper-Folly` (≈2021) and RN's `RCT-Folly` (2024.x) define the same
`folly::` symbols with a **mismatched `folly::dynamic` ABI** (link-time ODR conflict). The Old-Arch Paper
bridge marshals all constants/messages through `folly::dynamic` (`convertIdToFollyDynamic`), so mixed-ABI
dynamics arrive in JS as empty `{}` — which is exactly the pathology the `patch-package` stack below
works around symptom-by-symptom (`scriptURL` undefined, `reactNativeVersion` null, `runApplication`
receiving `{}`, …). The New Architecture marshals via JSI directly (no `folly::dynamic` on that path),
which is why `bare-new-arch` / `expo-new-arch` iOS work. The same root crashes `expo-old-arch` (RN 0.79)
with SIGABRT in the fusebox inspector's `folly::toJson`.

**Practical setup for this example:** Android runs with full Flipper; on iOS install pods with
`NO_FLIPPER=1` (app works, Flipper intentionally not linked). For iOS Flipper debugging use the
New-Architecture examples. Full analysis: root README → *Troubleshooting → Old Architecture + iOS*.

## Prerequisites

- Node ≥ 20
- Android SDK / emulator or device
- Xcode 15+ / iOS Simulator (macOS)
- Flipper desktop app (for plugin inspection)

## Setup

From the repo root, build the library once:

```bash
npm run build
```

Then install the example:

```bash
cd examples/bare-old-arch
npm install
cd ios && pod install && cd ..
```

## Run

```bash
# Metro (reset cache after native or library changes)
npm run start:reset

# Android
npm run android

# iOS
npm run ios
```

## Flipper flags

Mirrors other examples:

| Platform | Setting |
|----------|---------|
| Android | `FLIPPER_DEBUG_ONLY=true`, `FLIPPER_AUTO_INIT=false` in `android/gradle.properties` |
| iOS | Same via `ENV` in `ios/Podfile` |

Call `initializeFlipper()` from JS when you want the desktop client to connect (see `src/App.tsx`).

## Monorepo linking

`react-native-flipper-kit` is linked with `file:../..`. `metro.config.js` forces this app's copies of `react`, `react-native`, and `react-native-flipper-kit` so Metro does not mix the repo root's RN 0.85 with this app's RN 0.76.

## iOS white screen (Old Arch)

If mount succeeds (`Running "…" with {"rootTag":1}`) but the screen stays white:

1. **`AppDelegate.mm`** — window first, then `RCTRootView` with **explicit screen bounds** (avoids 0×0 content view when Metro loads fast).
2. **`RCTRootView.m` patch** — fallback frame when `bundleFinishedLoading` runs before layout.
3. **`renderApplication.js` patch** — on Paper Old Arch, mount **without `AppContainer`** (dev overlays can block first paint); coerce `rootTag` to a number.
4. **`App.tsx`** — tiny shell first, **`DemoApp.tsx`** on `requestAnimationFrame`.
5. **`react-native-flipper-kit`** — iOS Old Arch skips blocking TurboModule / `getConstants()` paths.

After library or patch changes:

```bash
cd ../.. && npm run build
cd examples/bare-old-arch
npm install
npm run start:reset
npm run ios   # full native rebuild
```

## iOS entry point

Uses direct **`RCTBridge` + `RCTRootView`** in `AppDelegate.mm` (same pattern as `bare-old-arch`), not the default `RCTAppDelegate` template — more reliable on Paper bridge with monorepo linking.

## Patches

This example uses **`patch-package`** (`patches/react-native+0.76.9.patch`, **16 files**) that works around the *symptoms* of the dual-folly ABI conflict described above (empty `{}` constants on the Paper bridge when FlipperKit is linked). With `NO_FLIPPER=1` these patches are not needed — kept for the historical record of the investigation:

| Layer | Symptom | Fix |
| --- | --- | --- |
| 1–2 | `major` / `screen` / `match` of undefined; `AppRegistry` not callable | Guards in `getDevServer`, `ReactNativeVersionCheck`, `Platform.ios`, `Settings.ios`; skip `LogBox.install` + Fusebox on Old Arch |
| 3 | `runApplication` receives `{}` | Native `RCTRootView.m` / `RCTSurface.mm` pass `(moduleName, rootTag, initialProps)`; JS `AppRegistry.js` |
| 5–6 | Touch / Dimensions | `RCTTouchEvent.m` tuples + `RCTEventEmitter.js`; `Dimensions.js` + `NativeDeviceInfo.js` fallbacks |

Applied automatically on `npm install` (`postinstall: patch-package`).

**Rebuild matrix:**

| Change | Action |
| --- | --- |
| Patch JS only | `npm install` + Metro `--reset-cache` + reload |
| Patch native (`.m`/`.mm`) | + `npm run ios` full rebuild |
| Library `src/index.ts` | `npm run build` at repo root + Metro reset |

Do not press **`j`** in Metro on Old Arch — Fusebox/CDP is disabled in the patch.

## Plugin demos

Same UI as `bare-new-arch` / `bare-old-arch`: Network, Layout, Logs, UserDefaults (iOS), SharedPreferences / Database / Crash / Leak (Android). See in-app warnings for platform-specific limitations.
