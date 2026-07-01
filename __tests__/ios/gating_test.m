// Host-side unit test for the iOS Flipper gating logic.
// Compiled and run natively (no simulator) — see the `ios` CI job:
//   clang -framework Foundation -I ios __tests__/ios/gating_test.m -o gating_test && ./gating_test
#import <Foundation/Foundation.h>
#import "ReactNativeFlipperKitConfig.h"

static int gFailures = 0;

static void check(const char *name, BOOL actual, BOOL expected)
{
  if (actual != expected) {
    fprintf(stderr, "FAIL: %s (expected %d, got %d)\n", name, expected, actual);
    gFailures++;
  }
}

int main(void)
{
  // enabled = NO -> always off, regardless of the other flags.
  check("disabled stays off (debug-only build, debug)", ReactNativeFlipperKitResolveShouldEnable(NO, YES, YES), NO);
  check("disabled stays off (release)", ReactNativeFlipperKitResolveShouldEnable(NO, NO, NO), NO);

  // enabled = YES, debugOnly = NO -> on in every configuration.
  check("always-on in debug", ReactNativeFlipperKitResolveShouldEnable(YES, NO, YES), YES);
  check("always-on in release", ReactNativeFlipperKitResolveShouldEnable(YES, NO, NO), YES);

  // enabled = YES, debugOnly = YES -> only on in debug builds.
  check("debug-only enabled in debug", ReactNativeFlipperKitResolveShouldEnable(YES, YES, YES), YES);
  check("debug-only disabled in release", ReactNativeFlipperKitResolveShouldEnable(YES, YES, NO), NO);

  if (gFailures > 0) {
    fprintf(stderr, "%d iOS gating test(s) failed\n", gFailures);
    return 1;
  }

  printf("All iOS gating tests passed\n");
  return 0;
}
