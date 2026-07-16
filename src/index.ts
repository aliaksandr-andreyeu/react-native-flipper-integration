import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeReactNativeFlipperKit';

const LINKING_ERROR =
  "The package 'react-native-flipper-kit' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- FLIPPER_DEBUG_ONLY is configured in gradle.properties / ENV for iOS\n' +
  '- The installed version of react-native-flipper-kit matches your React Native version\n';

type LegacyNativeModule = {
  flipperEnabled?: boolean | number;
  flipperDebugOnly?: boolean | number;
  isEnabled?: () => boolean;
  isDebugOnly?: () => boolean;
  start?: () => void;
  getConstants?: () => {
    flipperEnabled?: boolean | number;
    flipperDebugOnly?: boolean | number;
  };
};

function coerceNativeBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

function isOldArchPaper(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  const g = global as typeof globalThis & {
    RN$Bridgeless?: boolean;
    nativeFabricUIManager?: unknown;
  };
  return g.RN$Bridgeless !== true && g.nativeFabricUIManager == null;
}

function readLegacyFlipperConstants(
  legacy: LegacyNativeModule
): { flipperEnabled: boolean; flipperDebugOnly: boolean } | null {
  const legacyRecord = legacy as Record<string, unknown>;
  const fromModule = {
    flipperEnabled: coerceNativeBool(legacy.flipperEnabled ?? legacyRecord['flipperEnabled']),
    flipperDebugOnly: coerceNativeBool(legacy.flipperDebugOnly ?? legacyRecord['flipperDebugOnly'])
  };
  if (fromModule.flipperEnabled !== undefined && fromModule.flipperDebugOnly !== undefined) {
    return {
      flipperEnabled: fromModule.flipperEnabled,
      flipperDebugOnly: fromModule.flipperDebugOnly
    };
  }

  // getConstants() can block the Paper bridge on Old Arch iOS — only use direct exports.
  if (isOldArchPaper()) {
    return null;
  }

  const constants = legacy.getConstants?.();
  if (constants != null) {
    const constantsRecord = constants as Record<string, unknown>;
    const flipperEnabled = coerceNativeBool(constants.flipperEnabled ?? constantsRecord['flipperEnabled']);
    const flipperDebugOnly = coerceNativeBool(constants.flipperDebugOnly ?? constantsRecord['flipperDebugOnly']);
    if (flipperEnabled !== undefined && flipperDebugOnly !== undefined) {
      return { flipperEnabled, flipperDebugOnly };
    }
  }

  return null;
}

function isSpecModule(module: unknown): module is Spec {
  const candidate = module as Spec | null | undefined;
  return (
    candidate != null &&
    typeof candidate.isEnabled === 'function' &&
    typeof candidate.isDebugOnly === 'function' &&
    typeof candidate.start === 'function'
  );
}

function legacyModuleFromConstants(
  legacy: LegacyNativeModule,
  legacyConstants: { flipperEnabled: boolean; flipperDebugOnly: boolean }
): Spec {
  return {
    isEnabled: () => legacyConstants.flipperEnabled,
    isDebugOnly: () => legacyConstants.flipperDebugOnly,
    start: () => legacy.start?.()
  };
}

function legacyModuleWithSafeDefaults(legacy: LegacyNativeModule): Spec {
  const constants = readLegacyFlipperConstants(legacy);
  return {
    isEnabled: () => constants?.flipperEnabled ?? false,
    isDebugOnly: () => constants?.flipperDebugOnly ?? true,
    start: () => legacy.start?.()
  };
}

function resolveReactNativeFlipperKitModule(): Spec {
  // Old Arch iOS: constants are the safe path (no blocking sync). Check legacy first on every
  // call — do not cache at module load; NativeModules may be empty during bundle init.
  const legacy = NativeModules.ReactNativeFlipperKit as LegacyNativeModule | undefined;
  const legacyConstants = legacy != null ? readLegacyFlipperConstants(legacy) : null;
  if (legacy != null && legacyConstants != null) {
    return legacyModuleFromConstants(legacy, legacyConstants);
  }

  // Old Arch Paper: TurboModule / legacy spec stubs can deadlock on isEnabled().
  if (!isOldArchPaper()) {
    const turbo = TurboModuleRegistry.get<Spec>('ReactNativeFlipperKit');
    if (isSpecModule(turbo)) {
      return turbo;
    }

    if (legacy != null && isSpecModule(legacy)) {
      return legacy;
    }
  }

  if (legacy != null && typeof legacy.start === 'function') {
    return legacyModuleWithSafeDefaults(legacy);
  }

  return new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      }
    }
  ) as Spec;
}

function getReactNativeFlipperKitModule(): Spec {
  return resolveReactNativeFlipperKitModule();
}

export function isFlipperEnabled(): boolean {
  return getReactNativeFlipperKitModule().isEnabled();
}

/**
 * Whether the build is configured as debug-only.
 *
 * Returns the **build-time** `FLIPPER_DEBUG_ONLY` flag, not the runtime enabled state.
 * It is independent of `isFlipperEnabled()`: e.g. with `NO_FLIPPER=1` you get
 * `isFlipperEnabled() === false` while `isFlipperDebugOnly()` may still be `true`.
 */
export function isFlipperDebugOnly(): boolean {
  return getReactNativeFlipperKitModule().isDebugOnly();
}

/**
 * Trigger native Flipper initialization from JS. Idempotent — safe to call more than once.
 *
 * By default initialization is **automatic** (Android: on native module creation; iOS: on
 * `UIApplicationDidFinishLaunchingNotification`), so this call is then redundant.
 *
 * Set the build flag **`FLIPPER_AUTO_INIT=false`** (Gradle property / iOS ENV /
 * `Podfile.properties.json`, or the Expo plugin's `flipperAutoInit: false`) to disable
 * auto-init; this function then becomes the explicit entry point, letting the app control
 * *when* Flipper starts (e.g. after user consent or a remote flag). On Android, calling it
 * also guarantees the native module is constructed under the New Architecture (where
 * TurboModules are created lazily).
 */
export function initializeFlipper(): void {
  getReactNativeFlipperKitModule().start();
}
