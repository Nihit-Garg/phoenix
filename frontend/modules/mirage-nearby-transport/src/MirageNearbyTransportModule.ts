import { NativeModule, requireNativeModule } from 'expo';
import { MirageNearbyTransportModuleEvents, NearbyPeer } from './MirageNearbyTransport.types';

declare class MirageNearbyTransportModule extends NativeModule<MirageNearbyTransportModuleEvents> {
  isSupported(): boolean;
  start(endpointName: string): boolean;
  stop(): boolean;
  connect(endpointId: string): boolean;
  disconnect(endpointId: string): boolean;
  getPeers(): Promise<NearbyPeer[]>;
  send(endpointId: string, payload: string, requestId: string): boolean;
}

export default requireNativeModule<MirageNearbyTransportModule>('MirageNearbyTransport');
