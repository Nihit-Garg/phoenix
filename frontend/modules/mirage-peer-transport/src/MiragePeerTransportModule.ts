import { NativeModule, requireNativeModule } from 'expo';

import { MiragePeerTransportModuleEvents, Peer } from './MiragePeerTransport.types';

declare class MiragePeerTransportModule extends NativeModule<MiragePeerTransportModuleEvents> {
  isSupported(): boolean;
  startDiscovery(): boolean;
  stopDiscovery(): boolean;
  connect(deviceAddress: string): boolean;
  disconnect(): boolean;
  getPeers(): Promise<Peer[]>;
}

export default requireNativeModule<MiragePeerTransportModule>('MiragePeerTransport');
