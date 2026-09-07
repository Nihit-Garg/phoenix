import { PermissionsAndroid, Platform } from 'react-native';
import NativeWifiDirect, { Peer } from '../../modules/mirage-peer-transport';
import { PeerEndpoint, PeerTransport, TransportEvent } from '../../../backend/src/transport';

/** Wi-Fi Direct discovery adapter. UDP packet I/O is added in Part 2. */
export class WifiDirectTransport implements PeerTransport {
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  private subscriptions: Array<{ remove(): void }> = [];
  async start(): Promise<void> {
    this.emit({ type: 'status', status: 'starting' });
    const permission = typeof Platform.Version === 'number' && Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    if ((await PermissionsAndroid.request(permission)) !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Nearby Wi-Fi permission is required for peer discovery.');
    if (!NativeWifiDirect.isSupported()) throw new Error('Wi-Fi Direct is not supported on this phone.');
    this.subscriptions = [
      NativeWifiDirect.addListener('onStatus', ({ status }) => this.emit({ type: 'status', status: status === 'ready' ? 'ready' : 'starting' })),
      NativeWifiDirect.addListener('onPeer', (peer: Peer) => this.recordPeer(peer)),
      NativeWifiDirect.addListener('onError', ({ message }) => this.emit({ type: 'error', error: new Error(message) })),
    ];
    NativeWifiDirect.startDiscovery();
  }
  async stop(): Promise<void> { NativeWifiDirect.stopDiscovery(); this.subscriptions.forEach((item) => item.remove()); this.subscriptions = []; this.emit({ type: 'status', status: 'stopped' }); }
  async connect(peerId: string): Promise<void> { NativeWifiDirect.connect(peerId); }
  async disconnect(_peerId: string): Promise<void> { NativeWifiDirect.disconnect(); }
  async send(_peerId: string, _bytes: Uint8Array): Promise<void> { throw new Error('UDP packet delivery is implemented in Part 2.'); }
  async broadcast(_bytes: Uint8Array, _exceptPeerId?: string): Promise<void> { throw new Error('UDP packet delivery is implemented in Part 2.'); }
  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }
  subscribe(listener: (event: TransportEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private recordPeer(peer: Peer): void { const endpoint = { peerId: peer.deviceAddress, displayName: peer.deviceName, status: peer.status, lastSeenAt: Date.now() } as PeerEndpoint; this.peers.set(endpoint.peerId, endpoint); this.emit({ type: 'peer', peer: endpoint }); }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}
