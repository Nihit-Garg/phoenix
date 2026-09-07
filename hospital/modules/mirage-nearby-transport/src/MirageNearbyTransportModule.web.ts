import { NativeModule, registerWebModule } from 'expo';
import { MirageNearbyTransportModuleEvents } from './MirageNearbyTransport.types';

class MirageNearbyTransportModule extends NativeModule<MirageNearbyTransportModuleEvents> {}
export default registerWebModule(MirageNearbyTransportModule, 'MirageNearbyTransportModule');
