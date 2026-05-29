#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^FlipperIntegrationPluginSetupBlock)(id client);

BOOL FlipperIntegrationShouldEnable(void);
BOOL FlipperIntegrationIsDebugOnly(void);
void FlipperIntegrationRegisterPluginSetup(FlipperIntegrationPluginSetupBlock block);
void FlipperIntegrationInitialize(UIApplication *application);

NS_ASSUME_NONNULL_END
