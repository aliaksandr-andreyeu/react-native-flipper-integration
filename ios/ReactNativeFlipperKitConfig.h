/**
 * Flipper initialization and plugin registration (iOS).
 * Used by the native module and auto-initializer.
 */
#import <Foundation/Foundation.h>

@class UIApplication;

NS_ASSUME_NONNULL_BEGIN

/** Called with FlipperClient* when FlipperKit is linked. */
typedef void (^ReactNativeFlipperKitPluginSetupBlock)(id client);

/**
 * Pure gating logic, free of UIKit and build-time flags, so it can be unit-tested
 * on the host. ReactNativeFlipperKitShouldEnable() feeds the compile-time flags into it.
 */
static inline BOOL ReactNativeFlipperKitResolveShouldEnable(BOOL enabled, BOOL debugOnly, BOOL isDebug)
{
  if (!enabled) {
    return NO;
  }
  if (debugOnly && !isDebug) {
    return NO;
  }
  return YES;
}

/** Whether Flipper should run in the current build (FLIPPER_ENABLED / FLIPPER_DEBUG_ONLY). */
BOOL ReactNativeFlipperKitShouldEnable(void);

/** Mirrors FLIPPER_DEBUG_ONLY at build time. */
BOOL ReactNativeFlipperKitIsDebugOnly(void);

/** Whether Flipper auto-starts on app launch (FLIPPER_AUTO_INIT). When NO, the app must
 *  call initializeFlipper() from JS. */
BOOL ReactNativeFlipperKitIsAutoInitEnabled(void);

/** Register a custom plugin before the client starts. Safe to call from AppDelegate early. */
void ReactNativeFlipperKitRegisterPluginSetup(ReactNativeFlipperKitPluginSetupBlock block);

/** Start Flipper with default plugins. Idempotent — runs once per process. */
void ReactNativeFlipperKitInitialize(UIApplication *application);

NS_ASSUME_NONNULL_END
