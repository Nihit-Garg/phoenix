import { registerWebModule, NativeModule } from 'expo';

import { MiragePeerTransportModuleEvents } from './MiragePeerTransport.types';

// MiragePeerTransportModule is not available on the web platform.
class MiragePeerTransportModule extends NativeModule<MiragePeerTransportModuleEvents> {}

export default registerWebModule(MiragePeerTransportModule, 'MiragePeerTransportModule');
