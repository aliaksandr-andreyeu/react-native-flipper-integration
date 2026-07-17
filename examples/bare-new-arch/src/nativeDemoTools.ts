import { NativeModules, Platform } from 'react-native';

type DemoToolsNative = {
  crashNative: () => void;
  triggerLeak: () => void;
};

// Android-only native module (see android/.../DemoToolsModule.kt). Absent on iOS.
const native = NativeModules.DemoTools as Partial<DemoToolsNative> | undefined;

export const demoTools = {
  /** Whether the native helper module is linked (Android debug builds). */
  hasNative: typeof native?.crashNative === 'function',

  /**
   * Force a crash that reaches Flipper's Crash Reporter.
   * Android: throws on a background thread natively → hits the global uncaught handler the
   * module installs. iOS / no native module: throws from JS (red box in dev) — FlipperKit
   * has no iOS crash plugin, so this is only observable in Xcode/console.
   */
  crash(): void {
    if (native?.crashNative) {
      native.crashNative();
      return;
    }
    throw new Error(
      `Demo crash (JS, ${Platform.OS}) — no native crash module; not visible in Flipper Crash Reporter`
    );
  },

  /** Android only: deliberately leak an object so LeakCanary reports it to Flipper. */
  triggerLeak(): boolean {
    if (native?.triggerLeak) {
      native.triggerLeak();
      return true;
    }
    return false;
  }
};
