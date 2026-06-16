// Default Flipper plugins and extension hooks (layout, network, UserDefaults, React).
#import "FlipperIntegrationConfig.h"
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

static BOOL gFlipperIntegrationInitialized = NO;
static NSMutableArray<FlipperIntegrationPluginSetupBlock> *gFlipperIntegrationPluginSetups;

static NSMutableArray<FlipperIntegrationPluginSetupBlock> *FlipperIntegrationPluginSetups(void)
{
  if (gFlipperIntegrationPluginSetups == nil) {
    gFlipperIntegrationPluginSetups = [NSMutableArray array];
  }
  return gFlipperIntegrationPluginSetups;
}

BOOL FlipperIntegrationShouldEnable(void)
{
#if DEBUG
  BOOL isDebug = YES;
#else
  BOOL isDebug = NO;
#endif
  return FlipperIntegrationResolveShouldEnable(FLIPPER_ENABLED, FLIPPER_DEBUG_ONLY, isDebug);
}

BOOL FlipperIntegrationIsDebugOnly(void)
{
  return FLIPPER_DEBUG_ONLY == 1;
}

void FlipperIntegrationRegisterPluginSetup(FlipperIntegrationPluginSetupBlock block)
{
  if (block == nil) {
    return;
  }
  @synchronized(FlipperIntegrationPluginSetups()) {
    [FlipperIntegrationPluginSetups() addObject:[block copy]];
  }
}

void FlipperIntegrationInitialize(UIApplication *application)
{
  if (!FlipperIntegrationShouldEnable()) {
    return;
  }

  @synchronized(FlipperIntegrationPluginSetups()) {
    if (gFlipperIntegrationInitialized) {
      return;
    }
    gFlipperIntegrationInitialized = YES;
  }

#if defined(FLIPPER_KIT_AVAILABLE)
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application
                                              withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];

  NSArray<FlipperIntegrationPluginSetupBlock> *setups;
  @synchronized(FlipperIntegrationPluginSetups()) {
    setups = [FlipperIntegrationPluginSetups() copy];
  }
  for (FlipperIntegrationPluginSetupBlock setup in setups) {
    setup(client);
  }

  [client start];
#endif
}
