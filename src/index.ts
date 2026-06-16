import { NativeModules, Platform } from 'react-native';
import NativeFlipperIntegration, { type Spec } from './NativeFlipperIntegration';

const LINKING_ERROR =
  "The package 'react-native-flipper-integration' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- FLIPPER_DEBUG_ONLY is configured in gradle.properties / ENV for iOS\n';

const FlipperIntegrationModule: Spec =
  NativeFlipperIntegration ??
  NativeModules.FlipperIntegration ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      }
    }
  );

export function isFlipperEnabled(): boolean {
  return FlipperIntegrationModule.isEnabled();
}

export function isFlipperDebugOnly(): boolean {
  return FlipperIntegrationModule.isDebugOnly();
}

export function initializeFlipper(): void {
  FlipperIntegrationModule.start();
}
