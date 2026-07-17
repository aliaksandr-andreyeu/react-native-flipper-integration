// Default Flipper plugins and extension hooks (layout, network, UserDefaults, React).
#import "ReactNativeFlipperKitConfig.h"
#import <UIKit/UIKit.h>

#if FLIPPER_ENABLED && defined(FB_SONARKIT_ENABLED)
#if __has_include(<FlipperKit/FlipperClient.h>)
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKit/FlipperKitLayoutPlugin/SKDescriptorMapper.h>
#import <FlipperKit/FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <FlipperKit/FlipperKitReactPlugin/FlipperKitReactPlugin.h>
#import <FlipperKit/FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKit/SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#define FLIPPER_KIT_AVAILABLE 1
#endif
#endif

#ifndef FLIPPER_ENABLED
#define FLIPPER_ENABLED 1
#endif

#ifndef FLIPPER_DEBUG_ONLY
#define FLIPPER_DEBUG_ONLY 1
#endif

#ifndef FLIPPER_AUTO_INIT
#define FLIPPER_AUTO_INIT 1
#endif

typedef NS_ENUM(NSInteger, ReactNativeFlipperKitInitState) {
  ReactNativeFlipperKitInitIdle = 0,
  ReactNativeFlipperKitInitInProgress,
  ReactNativeFlipperKitInitDone,
};

// Tri-state init guard. The flag becomes Done only after `[client start]` succeeds, so a
// failed start rolls back to Idle and can be retried instead of being stuck "initialized".
// In-progress blocks concurrent/repeat initialize() calls from double-starting.
static ReactNativeFlipperKitInitState gReactNativeFlipperKitInitState = ReactNativeFlipperKitInitIdle;
static NSMutableArray<ReactNativeFlipperKitPluginSetupBlock> *gReactNativeFlipperKitPluginSetups;

// Dedicated lock token, created exactly once. We must NOT synchronize on the lazily
// created plugin-setups array: two threads racing the first access could each build a
// different NSMutableArray and lock on different objects, defeating the guard. The token
// is initialized via dispatch_once so the monitor (and the array) are stable from the
// first use on any thread.
static id gReactNativeFlipperKitLock;

static void ReactNativeFlipperKitEnsureState(void)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    gReactNativeFlipperKitLock = [NSObject new];
    gReactNativeFlipperKitPluginSetups = [NSMutableArray array];
  });
}

static id ReactNativeFlipperKitLock(void)
{
  ReactNativeFlipperKitEnsureState();
  return gReactNativeFlipperKitLock;
}

static NSMutableArray<ReactNativeFlipperKitPluginSetupBlock> *ReactNativeFlipperKitPluginSetups(void)
{
  ReactNativeFlipperKitEnsureState();
  return gReactNativeFlipperKitPluginSetups;
}

BOOL ReactNativeFlipperKitShouldEnable(void)
{
#if DEBUG
  BOOL isDebug = YES;
#else
  BOOL isDebug = NO;
#endif
  return ReactNativeFlipperKitResolveShouldEnable(FLIPPER_ENABLED, FLIPPER_DEBUG_ONLY, isDebug);
}

BOOL ReactNativeFlipperKitIsDebugOnly(void)
{
  return FLIPPER_DEBUG_ONLY == 1;
}

BOOL ReactNativeFlipperKitIsAutoInitEnabled(void)
{
  return FLIPPER_AUTO_INIT == 1;
}

void ReactNativeFlipperKitRegisterPluginSetup(ReactNativeFlipperKitPluginSetupBlock block)
{
  if (block == nil) {
    return;
  }
  @synchronized(ReactNativeFlipperKitLock()) {
    if (gReactNativeFlipperKitInitState == ReactNativeFlipperKitInitDone) {
      // The client already started; the setups array was captured at start time, so this
      // block will not be applied. Warn instead of silently dropping it.
      NSLog(@"[ReactNativeFlipperKit] Flipper client already started; plugin setup registered "
            @"after start will not take effect. Register it before app launch.");
    }
    [ReactNativeFlipperKitPluginSetups() addObject:[block copy]];
  }
}

void ReactNativeFlipperKitInitialize(UIApplication *application)
{
  if (!ReactNativeFlipperKitShouldEnable()) {
    return;
  }

  // Claim the single-initializer slot. Only an Idle -> InProgress transition proceeds;
  // a concurrent or repeat call sees InProgress/Done and bails.
  @synchronized(ReactNativeFlipperKitLock()) {
    if (gReactNativeFlipperKitInitState != ReactNativeFlipperKitInitIdle) {
      return;
    }
    gReactNativeFlipperKitInitState = ReactNativeFlipperKitInitInProgress;
  }

#if defined(FLIPPER_KIT_AVAILABLE)
  @try {
    FlipperClient *client = [FlipperClient sharedClient];
    SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
    [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application
                                                withDescriptorMapper:layoutDescriptorMapper]];
    [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
    [client addPlugin:[FlipperKitReactPlugin new]];
    [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];

    NSArray<ReactNativeFlipperKitPluginSetupBlock> *setups;
    @synchronized(ReactNativeFlipperKitLock()) {
      setups = [ReactNativeFlipperKitPluginSetups() copy];
    }
    for (ReactNativeFlipperKitPluginSetupBlock setup in setups) {
      setup(client);
    }

    [client start];

    // Mark Done only after a successful start so a failed init can be retried.
    @synchronized(ReactNativeFlipperKitLock()) {
      gReactNativeFlipperKitInitState = ReactNativeFlipperKitInitDone;
    }
  } @catch (NSException *exception) {
    // Roll back so a later initialize() can try again instead of being stuck.
    @synchronized(ReactNativeFlipperKitLock()) {
      gReactNativeFlipperKitInitState = ReactNativeFlipperKitInitIdle;
    }
    NSLog(@"[ReactNativeFlipperKit] initialization failed: %@; will retry on the next initialize()", exception);
  }
#else
  // No FlipperKit linked (release / no-op build): nothing to start, settle as Done.
  @synchronized(ReactNativeFlipperKitLock()) {
    gReactNativeFlipperKitInitState = ReactNativeFlipperKitInitDone;
  }
#endif
}
