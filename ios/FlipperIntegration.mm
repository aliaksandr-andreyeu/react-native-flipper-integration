// Native module: JS API (isEnabled / isDebugOnly / start) + Turbo Module when New Architecture is on.
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import "FlipperIntegrationConfig.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNFlipperIntegrationSpec/RNFlipperIntegrationSpec.h>
#endif

#ifdef RCT_NEW_ARCH_ENABLED

using namespace facebook::react;

@interface FlipperIntegration : NSObject <NativeFlipperIntegrationSpec>
@end

#else

@interface FlipperIntegration : NSObject <RCTBridgeModule>
@end

#endif

@implementation FlipperIntegration

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

#ifdef RCT_NEW_ARCH_ENABLED

- (NSNumber *)isEnabled
{
  return @(FlipperIntegrationShouldEnable());
}

- (NSNumber *)isDebugOnly
{
  return @(FlipperIntegrationIsDebugOnly());
}

- (void)start
{
  dispatch_async(dispatch_get_main_queue(), ^{
    FlipperIntegrationInitialize([UIApplication sharedApplication]);
  });
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeFlipperIntegrationSpecJSI>(params);
}

#else

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isEnabled)
{
  return @(FlipperIntegrationShouldEnable());
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isDebugOnly)
{
  return @(FlipperIntegrationIsDebugOnly());
}

RCT_EXPORT_METHOD(start)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    FlipperIntegrationInitialize([UIApplication sharedApplication]);
  });
}

#endif

@end
