import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isEnabled(): boolean;
  isDebugOnly(): boolean;
  start(): void;
}

export default TurboModuleRegistry.get<Spec>('FlipperIntegration');
