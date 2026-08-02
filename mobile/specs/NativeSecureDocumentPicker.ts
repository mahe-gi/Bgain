import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  pickDocument(): Promise<{
    uri: string;
    name: string;
    type: string;
    size: number | null;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeSecureDocumentPicker'
);
