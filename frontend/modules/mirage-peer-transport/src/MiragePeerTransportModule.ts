import { NativeModule, requireNativeModule } from 'expo';

import { MiragePeerTransportModuleEvents, Peer } from './MiragePeerTransport.types';

declare class MiragePeerTransportModule extends NativeModule<MiragePeerTransportModuleEvents> {
  isSupported(): boolean;
  startDiscovery(): boolean;
  stopDiscovery(): boolean;
  connect(deviceAddress: string, groupOwnerIntent: number): boolean;
  createGroup(): boolean;
  disconnect(): boolean;
  getPeers(): Promise<Peer[]>;
  startUdp(port: number): boolean;
  stopUdp(): boolean;
  sendUdp(host: string, port: number, payload: string, requestId: string): boolean;
}

export default requireNativeModule<MiragePeerTransportModule>('MiragePeerTransport');
