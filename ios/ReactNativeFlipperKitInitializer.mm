// Auto-starts Flipper on UIApplicationDidFinishLaunchingNotification (debug builds only,
// and only when FLIPPER_AUTO_INIT is enabled).
#import <UIKit/UIKit.h>
#import "ReactNativeFlipperKitConfig.h"

@interface ReactNativeFlipperKitInitializer : NSObject
@end

@implementation ReactNativeFlipperKitInitializer

+ (void)load
{
  // Skip auto-start when FLIPPER_AUTO_INIT is off — the app drives init via initializeFlipper().
  if (!ReactNativeFlipperKitIsAutoInitEnabled()) {
    return;
  }

  if (!ReactNativeFlipperKitShouldEnable()) {
    return;
  }

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(onApplicationDidFinishLaunching:)
                                               name:UIApplicationDidFinishLaunchingNotification
                                             object:nil];
}

+ (void)onApplicationDidFinishLaunching:(NSNotification *)notification
{
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIApplicationDidFinishLaunchingNotification
                                                object:nil];

  UIApplication *application = notification.object;
  if (application == nil) {
    application = [UIApplication sharedApplication];
  }

  ReactNativeFlipperKitInitialize(application);
}

@end
