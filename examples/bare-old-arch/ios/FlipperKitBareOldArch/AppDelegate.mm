#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

/// Old Architecture entry: direct `RCTBridge` + `RCTRootView` (same as bare-old-arch).
/// `runApplication` args are fixed in `patches/react-native+0.76.9.patch`.
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  self.bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];

  // Non-zero frame before JS runs — initWithBridge uses CGRectZero and a fast Metro bundle
  // can call runApplication before layout, leaving RCTRootContentView at 0×0 (blank screen).
  RCTRootView *rootView = [[RCTRootView alloc] initWithFrame:self.window.bounds
                                                      bridge:self.bridge
                                                  moduleName:@"FlipperKitBareOldArch"
                                           initialProperties:nil];
  rootView.backgroundColor = [UIColor colorWithRed:0.949 green:0.953 blue:0.961 alpha:1.0];

  rootViewController.view = rootView;
  [rootView layoutIfNeeded];

  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
