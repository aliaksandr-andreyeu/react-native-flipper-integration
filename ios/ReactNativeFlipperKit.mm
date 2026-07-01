// Native module: JS API (isEnabled / isDebugOnly / start) + Turbo Module when New Architecture is on.
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import "ReactNativeFlipperKitConfig.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNFlipperKitSpec/RNFlipperKitSpec.h>
#endif

#ifdef RCT_NEW_ARCH_ENABLED

using namespace facebook::react;

@interface ReactNativeFlipperKit : NSObject <NativeReactNativeFlipperKitSpec>
@end

#else

@interface ReactNativeFlipperKit : NSObject <RCTBridgeModule>
@end

#endif

@implementation ReactNativeFlipperKit

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  // Module init does no UI work (the boolean getters read compile-time flags and
  // `start` dispatches to the main queue itself), so it need not block app launch
  // on the main thread.
  return NO;
}

#ifdef RCT_NEW_ARCH_ENABLED

- (NSNumber *)isEnabled
{
  return @(ReactNativeFlipperKitShouldEnable());
}

- (NSNumber *)isDebugOnly
{
  return @(ReactNativeFlipperKitIsDebugOnly());
}

- (void)start
{
  dispatch_async(dispatch_get_main_queue(), ^{
    ReactNativeFlipperKitInitialize([UIApplication sharedApplication]);
  });
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeReactNativeFlipperKitSpecJSI>(params);
}

#else

// Export flags as constants instead of RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD. On Old
// Architecture, blocking sync calls during the first React render can deadlock the JS
// thread (bridge not ready yet) and produce a blank white screen with no redbox.
- (NSDictionary *)constantsToExport
{
  return @{
    @"flipperEnabled" : @(ReactNativeFlipperKitShouldEnable()),
    @"flipperDebugOnly" : @(ReactNativeFlipperKitIsDebugOnly()),
  };
}

RCT_EXPORT_METHOD(start)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    ReactNativeFlipperKitInitialize([UIApplication sharedApplication]);
  });
}

#endif

@end
