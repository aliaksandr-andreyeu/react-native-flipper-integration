// Native module: JS API (isEnabled / isDebugOnly / start) + Turbo Module when New Architecture is on.
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import "FlipperIntegrationConfig.h"

#if __has_include(<RNFlipperIntegrationSpec/RNFlipperIntegrationSpec.h>)
#import <RNFlipperIntegrationSpec/RNFlipperIntegrationSpec.h>
#endif

@interface FlipperIntegration : NSObject <RCTBridgeModule
#if __has_include(<RNFlipperIntegrationSpec/RNFlipperIntegrationSpec.h>)
, NativeFlipperIntegrationSpec
#endif
>
@end

@implementation FlipperIntegration

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

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

#if __has_include(<RNFlipperIntegrationSpec/RNFlipperIntegrationSpec.h>)
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

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeFlipperIntegrationSpecJSI>(params);
}
#endif

@end
