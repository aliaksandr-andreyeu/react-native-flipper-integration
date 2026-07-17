# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

> **First published release — target `1.0.0`.** Nothing has shipped under this name yet (no npm release, no git tags), so the native-identifier naming finalized below is **not** a breaking change for any consumer — a `2.0.0` major would falsely imply a prior stable line. `package.json` is set to `1.0.0`; the earlier `1.0.1` / `1.1.0` entries were internal, never published.

### Added

- **`FLIPPER_AUTO_INIT` build flag (default `true`)** — set to `false` to disable native auto-start and drive initialization explicitly from JS via `initializeFlipper()`, so the app controls _when_ Flipper starts (e.g. after user consent). Configurable on Android (`gradle.properties` / `-PFLIPPER_AUTO_INIT`), iOS (`FLIPPER_AUTO_INIT=false pod install` / `Podfile.properties.json`), and the Expo plugin (`flipperAutoInit: false`). `initializeFlipper()` is no longer marked deprecated — it is the supported entry point in this mode (and on the New Architecture also forces lazy TurboModule construction on Android).
- Android Flipper plugins registered out of the box: **Databases** (SQLite auto-discovery), **SharedPreferences** (default prefs file), **LeakCanary** (`flipper-leakcanary2-plugin` + bundled `leakcanary-android`, debug-only; version overridable via `LEAKCANARY_VERSION`), and **Crash Reporter** (a chained global uncaught-exception handler forwards crashes to the `CrashReporter` tab). Logs require no wiring — Flipper Desktop reads `adb logcat` / the iOS device console directly.
- Four example apps under `examples/` covering the full matrix (bare/Expo × old/new architecture): `bare-new-arch` (RN 0.85, reference), `bare-old-arch` (RN 0.76.9), `expo-new-arch` (SDK 57), `expo-old-arch` (SDK 53). Each links the module via `file:../..` + Metro `watchFolders` and demonstrates every plugin plus auto-vs-JS init. See [docs/ANALYSIS.md](docs/ANALYSIS.md) §3.
- `dependency-review` CI job (diff-scoped, `fail-on-severity: high`) that flags vulnerable dependencies a PR introduces.
- `security-audit.yml`: scheduled (weekly) + on-demand `npm audit` for the root and example packages — the blocking supply-chain signal.
- `lockfile-lint` now also validates `examples/bare-new-arch/package-lock.json`.
- iOS E2E job in the `Example E2E (Maestro)` workflow: builds the reference example for the simulator in Release (embedded JS bundle, no Metro; FlipperKit is debug-only so it is not linked, sidestepping Apple-Silicon simulator build issues), boots a simulator, installs `idb-companion`, and runs the Maestro smoke test. Manual-dispatch only until proven stable.
- Unified the example app identifiers under one scheme — `dev.cycleport.flipperkit.example.<name>` for Android `applicationId` and the iOS bundle id — so Maestro `appId` targeting works identically on both platforms (a stale template default `org.reactjs.native.example.*` was why the original iOS Maestro flow never launched the app).
- Release workflow now runs `typecheck`, `lint`, and `format:check` before publishing, and extracts + **validates** the CHANGELOG section (fails if the version's section is missing or empty).
- Cross-references in `android/build.gradle` and the podspec explaining the intentional Android/iOS Flipper version divergence.
- Android: a warning is logged before `NetworkingModule.setCustomClientBuilder` is called, since that global hook replaces any OkHttp client builder the app already set.
- Failure-recovery unit test for the Android init guard (delegate throws on first call, succeeds on retry).
- podspec: a warning (instead of a silent rescue) when `Podfile.properties.json` cannot be parsed, before falling back to ENV/defaults.
- Pinned Maestro version (`MAESTRO_VERSION`) in the E2E workflow for reproducible installs.
- Documented that `isFlipperDebugOnly()` returns the build-time flag, independent of `isFlipperEnabled()` (JSDoc + README).

### Changed

- **Native identifiers finalized under the package brand** (settled pre-first-release, so not a breaking change for consumers): the native module / iOS class / pod is **`ReactNativeFlipperKit`**, the Android package is **`dev.cycleport.flipperkit`**, and the codegen spec is **`RNFlipperKitSpec`**. The npm package name (`react-native-flipper-kit`) and the public JS API match. `FlipperKit` is intentionally avoided (collision with Facebook's framework).
- The example app moved from `example/` to **`examples/bare-new-arch/`** (the reference of the four). It now demonstrates every plugin — Network (`dummyjson`), Databases (`op-sqlite` + AsyncStorage's `RKStorage`), SharedPreferences/UserDefaults (`react-native-default-preference`), Logs (`console.*`), Crash Reporter and LeakCanary (via an example-only native `DemoTools` module, Android), and Layout.
- **iOS Old Architecture:** `isEnabled` / `isDebugOnly` are now exposed via `constantsToExport` (they are build-time flags) instead of `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`; `src/index.ts` reads those constants (coercing an NSNumber `0`/`1` to a boolean) before falling back to the Turbo Module (New Architecture) or legacy methods. This avoids a blocking synchronous native call during the first render, which can deadlock the JS thread (blank screen) on the legacy bridge. The New Architecture path is unchanged.
- Android: `ReactNativeFlipperKit.initialize` now pins the delegate start (Flipper SDK + the global `NetworkingModule` OkHttp builder) to the main thread — run inline when already on the main thread, posted otherwise. On the New Architecture the native module can be constructed off the main thread, so this makes the start thread deterministic.
- **`engines.node` lowered from `>=22` to `>=20`** — the published package is prebuilt, so the Node floor only needs to cover consumers on the current LTS line. Development still pins Node 24 via `.nvmrc`.
- **`peerDependencies.react` tightened from `*` to `>=18.2.0`.**
- `.nvmrc` and all CI workflows bumped to Node 24 (current Active LTS).
- CI `npm audit` is now non-blocking (`continue-on-error`); the authoritative, blocking audit moved to a scheduled `security-audit.yml` workflow so a newly published advisory surfaces on its own instead of failing unrelated pull requests.
- Removed the stray empty `android/src/debug/java/...` directory (the `debug` source set already pulls in `src/flipper/java`).
- Aligned the vestigial `expo.name` in `package.json` (`react-native-flipper-integration` → `react-native-flipper-kit`).
- Dependabot now watches `examples/bare-new-arch` (the reference example) and groups minor/patch updates into a single weekly PR (root, that example, and GitHub Actions). `react`/`react-native` remain manually managed (documented in the config).
- Consolidated the working audit/planning docs into [docs/ANALYSIS.md](docs/ANALYSIS.md) (with the deferred old-arch-iOS fix plan in [docs/prebuilt-flipperkit-xcframework.md](docs/prebuilt-flipperkit-xcframework.md)); removed the ad-hoc `OPUS.md` / `FABLE.md` / `PLAN.CURSOR.md` from the repo root.
- **CI simplified:** the required PR gate is now a single fast JS job (`ci.yml`: format / lint / typecheck / test / build / lockfile-lint, ~1-2 min on ubuntu). The heavy native checks (Android gradle + Robolectric + APK, iOS macOS host test + podspec lint) moved to a separate on-demand `native.yml` — run manually (`workflow_dispatch`) or automatically only when native paths change — and are no longer required to merge. `dependency-review` runs on PRs but is advisory (not required).

### Fixed

- **old-arch iOS is a documented limitation** (`examples/bare-old-arch` RN 0.76.9, `expo-old-arch` RN 0.79.6): linking FlipperKit breaks the iOS Paper bridge at runtime — white screen (RN 0.76) or SIGABRT in the fusebox inspector (RN 0.79). Proven root cause is an ABI/ODR conflict between FlipperKit's frozen `Flipper-Folly` (~2021) and RN's `RCT-Folly` (2024.x): the Paper bridge marshals constants through `folly::dynamic`, which arrive empty/mismatched. This affects **real** old-arch consumers, not just this repo (decisive test: `NO_FLIPPER=1 pod install` → renders; relink Flipper → breaks). Workaround: `NO_FLIPPER=1` on old-arch iOS (Android unaffected; New Arch unaffected). See [docs/ANALYSIS.md](docs/ANALYSIS.md) §4; RN-0.81 investigation artifacts kept in `examples/bare-old-arch/legacy-rn081-investigation/`.
- Example iOS app: Podfile `post_install` now patches `Flipper-Folly`'s `CacheLocality.h` (`std::is_trivial` → `std::is_trivially_destructible`) to fix the Xcode 16 / macOS Sequoia build error `static assertion failed … AccessSpreaderBase::GlobalState … not trivial`. Documented in the README for consumers (FlipperKit pulls the frozen `Flipper-Folly 2.6.x`). See facebook/flipper#5683.
- podspec: the `Podfile.properties.json` reader is now a local lambda instead of a top-level `def`. CocoaPods evaluates the podspec in the `Pod` module's scope, where a bareword `def` is not callable and raised `undefined method 'flipper_integration_prop' for module Pod` during `pod install`. A local lambda is captured by the eval scope and works reliably.
- iOS: fixed a latent data race in `ReactNativeFlipperKitConfig.mm` where the `@synchronized` monitor was the lazily-created plugin-setups array. Two threads racing the first access could lock on different objects and defeat the init guard. The lock token and array are now created once via `dispatch_once`.
- podspec: `s.authors` no longer passes the raw `package.author` object (now `{ name, url }`) to CocoaPods; it maps to the author name. `s.homepage` now uses `package.homepage` instead of `repository.url` (which carried a `.git` suffix).
- Example app: `initializeFlipper()` now runs inside a `useEffect` instead of during render (render must stay side-effect free).
- Init-timing (Android + iOS): the "initialized" flag is now set only **after** a successful start, via a tri-state guard (`Idle → InProgress → Done`). A failed `delegate.initialize()` / `[client start]` rolls back to `Idle`, so a later `initialize()` can retry instead of being permanently stuck. The single-initializer claim (`Idle → InProgress`) still prevents concurrent double-starts off the main thread.
- iOS: registering a custom plugin setup after the client has already started now logs a warning (the setup list is captured at start time and would otherwise be silently dropped).
- Android: plugin registration in the Flipper delegate is now at-most-once per process. The tri-state init guard allows a retry after a failed start, but `AndroidFlipperClient` is a process-wide singleton — a retry used to re-add every plugin (duplicate plugin ids could wedge all subsequent retries) and append a second LeakCanary event listener (duplicate leak reports). Registration is now one-shot (same pattern as the crash handler); only `client.start()` is retried.
- Dependabot: the examples updater pointed at the removed `example/` directory and had silently stopped working; it now watches `examples/bare-new-arch`.
- Root `eslint` / `prettier --check` no longer cover `examples/` (scaffolded template code and `.expo` artifacts made both gates fail on any PR after the `examples/` restructure). The root gates cover the library; each example is typechecked on its own.
- Removed dead fallback branches in `src/index.ts` (`legacy.prop ?? record['prop']` — both sides read the same property, the `??` arm was unreachable).
- Android auto-init stays tied to native-module construction and is intentionally **not** a process-start `ContentProvider`: Flipper requires `SoLoader`/`NativeLoader`, which React Native initializes in `Application.onCreate`. A `ContentProvider.onCreate` runs earlier and starting Flipper there crashes with `NativeLoader has not been initialized` (especially on the New Architecture). The documented "app must touch the JS API on Android for auto-init" limitation is the accepted trade-off.

## [1.1.0] - 2026-06-14

> **Package renamed:** `react-native-flipper-integration` → **`react-native-flipper-kit`**, published under the **cycleport** organization. Native identifiers (`FlipperIntegration`, `com.flipperintegration`, `RNFlipperIntegrationSpec`) are unchanged.

### Added

- iOS support in the Expo config plugin: writes `FLIPPER_DEBUG_ONLY` / `NO_FLIPPER` to `ios/Podfile.properties.json`, which the podspec reads as a fallback to `ENV` (ENV wins). `expo prebuild` now configures iOS, not just Android.
- `flipperVersion` option in the Expo config plugin (applied to Android; iOS keeps the podspec default unless `FLIPPER_VERSION` is set explicitly).
- `release.yml` workflow: on a `v*` tag, verifies tag↔version, tests, builds, and runs `npm publish --provenance --access public`, then creates a GitHub Release from the CHANGELOG. Plus `RELEASING.md`.
- `npm audit --audit-level=high` and `lockfile-lint` steps in CI; `lockfile-lint` dev dependency.
- Governance files: `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, PR template, and issue templates.
- `.nvmrc` (Node 22) and `.npmrc` (`engine-strict=true`).
- `cache-dependency-path` covering the example lockfile in `setup-node` cache keys.
- Robolectric unit tests for the Android `FlipperIntegration` object: build-flag gating in `shouldEnable`, `initialize` idempotency, no-op when disabled, and forwarding of registered plugin initializers.
- `android-build` CI job (`pull_request`) that bundles JS, runs the Android unit tests (`testDebugUnitTest`), and assembles the example debug APK — now part of the required `all-checks-passed` gate.
- `Example E2E (Maestro)` workflow: builds the example APK and runs the Maestro smoke test on an Android emulator (kept out of the required gate for now).
- iOS host-side unit test for the gating logic (`ios` CI job): compiles and runs `FlipperIntegrationResolveShouldEnable` natively, no simulator required.
- `engines` field in `package.json` declaring Node.js `>=22`.
- `github-actions` Dependabot updater so pinned workflow actions receive updates.
- Gradle build cache in CI via `gradle/actions/setup-gradle` for the Android and E2E jobs.
- `CHANGELOG.md` and a consolidated `ANALYSIS.md` (project review + status + open manual steps).

### Changed

- **`peerDependencies.react-native` raised from `>=0.73` to `>=0.74`** — the Android package extends `BaseReactPackage`, which only exists from React Native 0.74 onward.
- Android `FlipperIntegration` now resolves its delegate through a swappable internal field (enabling unit-test injection). Public API and runtime behavior are unchanged.
- iOS `FlipperIntegrationShouldEnable` now delegates to a pure, UIKit-free `FlipperIntegrationResolveShouldEnable` helper so the gating logic is host-testable. Runtime behavior is unchanged.
- JS API reuses the codegen `Spec` type instead of a hand-written module type in `src/index.ts`, keeping signatures in sync with the Turbo Module spec.
- `lint-staged` now runs `prettier`/`eslint` against staged files only (was re-formatting and re-linting the whole repo via `npm run` scripts) and no longer calls the redundant `git add`.
- iOS `requiresMainQueueSetup` returns `NO` (module init does no UI work), so it no longer blocks app launch on the main thread.
- `prepare` guards husky (`husky || true`) so `npm ci` stays resilient in CI/sandbox environments.
- `author` is now the Cycleport organization; the original author is listed under `contributors`.
- Removed the empty `src/extension.ts` doc module; native plugin-registration docs now live in the README and `ios/FlipperIntegrationConfig.h`.

### Fixed

- Expo config plugin no longer strips a user-set `FLIPPER_VERSION` (or other `FLIPPER_*` keys) from `gradle.properties` — it now only manages `FLIPPER_DEBUG_ONLY`, `NO_FLIPPER`, and (when provided) `FLIPPER_VERSION`.

### Documented

- Android network plugin limitation: the integration calls `NetworkingModule.setCustomClientBuilder` (a global hook) in debug builds, which replaces any custom OkHttp client builder already set by the app.
- iOS podspec: `FB_SONARKIT_ENABLED` is defined for all configurations but gated at compile time by `__has_include(<FlipperKit/...>)`, which is the authoritative per-configuration linkage gate.

## [1.0.1]

- Initial published baseline (configurable Flipper integration for React Native, Old + New Architecture).
