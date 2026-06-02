# react-native-flipper-integration

Configurable Flipper integration for React Native. Supports **Old Architecture** (Native Modules) and **New Architecture** (Turbo Modules / codegen).

> **Note:** Meta has placed Flipper in maintenance mode. This package targets teams that still use **[Flipper Desktop 0.239.0](https://github.com/facebook/flipper/releases/tag/v0.239.0)** with React Native. For greenfield projects, consider React DevTools, Xcode Instruments, and Android Studio profilers.

## Tested & verified

This module is actively used with **Flipper Desktop 0.239.0** (Electron **50.0.0**) - the **November 2023** release and the **last Electron build** with full React Native debugging support (Layout, Network, React DevTools, Hermes Debugger). **Everything works as expected** with this setup on React Native 0.85.

> Flipper 0.239.0 is the recommended desktop version for React Native projects. Later Flipper releases removed Electron artifacts and reduced RN plugin support.

---

## Requirements

| Component                  | Version                                                |
| -------------------------- | ------------------------------------------------------ |
| React Native               | ≥ 0.73 (tested on 0.85)                                |
| Flipper Desktop            | **0.239.0** (Electron **50.0.0**, Nov 2023) - verified |
| Android Flipper SDK        | `0.273.0` (default, override with `FLIPPER_VERSION`)   |
| iOS FlipperKit (CocoaPods) | `0.252.0` (default, override with `FLIPPER_VERSION`)   |
| Node.js                    | ≥ 22                                                   |

> **Desktop ↔ SDK:** Flipper Desktop **0.239.0** works with the native SDK versions bundled in this module. CocoaPods does not publish FlipperKit `0.273.0` for iOS - the latest available `0.252.0` is used instead.

---

## Installation

### 1. Add the dependency

**Local path (monorepo / boilerplate):**

```bash
npm install ./react-native-flipper-integration
```

**From npm (if published):**

```bash
npm install react-native-flipper-integration
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
  plugins: [['react-native-flipper-integration', { flipperDebugOnly: true }]]
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

- **Android** - when the `FlipperIntegration` native module is created (idempotent)
- **iOS** - via `UIApplicationDidFinishLaunchingNotification` (observer removed after first fire)

No extra code in `AppDelegate` / `MainApplication` is **required**.

### JavaScript / TypeScript API

```typescript
import { initializeFlipper, isFlipperEnabled, isFlipperDebugOnly } from 'react-native-flipper-integration';

if (isFlipperEnabled()) {
  console.log('Flipper is available');
}

console.log('Debug only:', isFlipperDebugOnly());

// Idempotent - safe to call; native init runs once per process
initializeFlipper();
```

Old Architecture uses `NativeModules` fallback; New Architecture uses the codegen Turbo Module (`TurboModuleRegistry.get`, not `getEnforcing`).

### Custom Flipper plugins (native)

Register **before** the first Flipper start (early `Application` / `AppDelegate`):

**Android (Kotlin):**

```kotlin
import com.flipperintegration.FlipperIntegration
import com.facebook.flipper.android.AndroidFlipperClient

FlipperIntegration.addPluginInitializer { client ->
  client as AndroidFlipperClient
  client.addPlugin(MyFlipperPlugin())
}
```

**iOS (Objective-C):**

```objc
#import "FlipperIntegrationConfig.h"

FlipperIntegrationRegisterPluginSetup(^(id client) {
  FlipperClient *flipperClient = (FlipperClient *)client;
  [flipperClient addPlugin:[[MyFlipperPlugin alloc] init]];
});
```

See `src/extension.ts` for typed documentation.

---

## Included out of the box

| Plugin                           | Android | iOS |
| -------------------------------- | ------- | --- |
| Layout Inspector                 | Yes     | Yes |
| Network (OkHttp / NSURL)         | Yes     | Yes |
| SharedPreferences / UserDefaults | No      | Yes |
| React DevTools plugin            | No      | Yes |

---

## React Native architecture support

| Mode             | Implementation                                                           |
| ---------------- | ------------------------------------------------------------------------ |
| Old Architecture | `NativeModules.FlipperIntegration` (JS fallback)                         |
| New Architecture | Turbo Module via `NativeFlipperIntegrationSpec` + `getTurboModule` (iOS) |

Android module extends generated `NativeFlipperIntegrationSpec`. iOS implements `NativeFlipperIntegrationSpec` when codegen headers are present.

---

## Module structure

```
react-native-flipper-integration/
├── src/
│   ├── index.ts
│   ├── NativeFlipperIntegration.ts   # codegen spec
│   └── extension.ts                  # custom plugin docs
├── android/
│   ├── build.gradle
│   ├── consumer-rules.pro
│   └── src/
│       ├── main/
│       ├── flipper/                    # real Flipper (debug or all variants)
│       └── release/                    # no-op (NO_FLIPPER / debug-only release)
├── ios/
│   ├── FlipperIntegration.mm           # Bridge + Turbo Module
│   ├── FlipperIntegrationConfig.*      # plugins + extension hooks
│   └── FlipperIntegrationInitializer.mm
├── example/                            # JS usage sample
├── app.plugin.js                       # Expo config plugin
└── FlipperIntegration.podspec
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

## Example app (Android / iOS)

Native example in `example/` with autolinked `react-native-flipper-integration`.

```bash
# From repo root
npm install
cd example && npm install

# Android
npm run example:android
# or: cd example && npm run android

# iOS
cd example/ios && pod install && cd .. && npm run ios
```

| Script (root)                   | Description                                                        |
| ------------------------------- | ------------------------------------------------------------------ |
| `npm run example`               | Start Metro for example                                            |
| `npm run example:android`       | Run on Android device/emulator                                     |
| `npm run example:ios`           | Run on iOS simulator                                               |
| `npm run example:android:build` | Assemble Debug APK                                                 |
| `npm run example:e2e`           | Maestro smoke (requires [Maestro CLI](https://maestro.mobile.dev)) |

### E2E (Maestro)

Flows live in `example/.maestro/`. Local run (Metro + installed app):

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
cd example && npm start &
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
