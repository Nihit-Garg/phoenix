import { NativeModule, requireNativeModule } from 'expo';

import { MiragePeerTransportModuleEvents } from './MiragePeerTransport.types';

declare class MiragePeerTransportModule extends NativeModule<MiragePeerTransportModuleEvents> {
  hello(): string;
}

export default requireNativeModule<MiragePeerTransportModule>('MiragePeerTransport');
