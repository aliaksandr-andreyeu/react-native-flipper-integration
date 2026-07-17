import { NativeModules, Platform } from 'react-native';

type DemoToolsNative = {
  crashNative: () => void;
  triggerLeak: () => void;
};

// Android-only native module (added via the withDemoTools config plugin; see
// plugins/withDemoTools.js). Read lazily — on the New Architecture the legacy-module
// interop may not have populated NativeModules yet at JS bundle-eval time, so caching
// this at import would strand `hasNative` at false forever.
function getNative(): Partial<DemoToolsNative> | undefined {
  return NativeModules.DemoTools as Partial<DemoToolsNative> | undefined;
}

export const demoTools = {
  /** Whether the native helper module is linked (Android debug builds). */
  get hasNative(): boolean {
    return typeof getNative()?.crashNative === 'function';
  },

  /**
   * Force a crash that reaches Flipper's Crash Reporter.
   * Android: throws on a background thread natively → hits the global uncaught handler the
   * module installs. iOS / no native module: throws from JS (red box in dev) — FlipperKit
   * has no iOS crash plugin, so this is only observable in Xcode/console.
   */
  crash(): void {
    const native = getNative();
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
    const native = getNative();
    if (native?.triggerLeak) {
      native.triggerLeak();
      return true;
    }
    return false;
  }
};
