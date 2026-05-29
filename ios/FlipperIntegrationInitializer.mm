#import <UIKit/UIKit.h>
#import "FlipperIntegrationConfig.h"

@interface FlipperIntegrationInitializer : NSObject
@end

@implementation FlipperIntegrationInitializer

+ (void)load
{
  if (!FlipperIntegrationShouldEnable()) {
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

  FlipperIntegrationInitialize(application);
}

@end
