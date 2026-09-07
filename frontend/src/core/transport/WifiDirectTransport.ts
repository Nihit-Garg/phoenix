import { PermissionsAndroid, Platform } from 'react-native';
import NativeWifiDirect, { Peer } from '../../../modules/mirage-peer-transport';
import { PeerEndpoint, PeerTransport, TransportEvent } from '../../../../backend/src/transport/PeerTransport';

/** Wi-Fi Direct discovery adapter. UDP packet I/O is added in Part 2. */
export class WifiDirectTransport implements PeerTransport {
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  private subscriptions: Array<{ remove(): void }> = [];
  private groupOwnerAddress?: string;
  async start(): Promise<void> {
    this.emit({ type: 'status', status: 'starting' });
    const permission = typeof Platform.Version === 'number' && Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    if ((await PermissionsAndroid.request(permission)) !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Nearby Wi-Fi permission is required for peer discovery.');
    if (!NativeWifiDirect.isSupported()) throw new Error('Wi-Fi Direct is not supported on this phone.');
    this.subscriptions = [
      NativeWifiDirect.addListener('onStatus', ({ status }) => this.emit({ type: 'status', status: status === 'ready' ? 'ready' : 'starting' })),
      NativeWifiDirect.addListener('onPeer', (peer: Peer) => this.recordPeer(peer)),
      NativeWifiDirect.addListener('onError', ({ message }) => this.emit({ type: 'error', error: new Error(message) })),
      NativeWifiDirect.addListener('onConnection', ({ groupOwnerAddress }) => { this.groupOwnerAddress = groupOwnerAddress ?? undefined; }),
      NativeWifiDirect.addListener('onPacket', ({ host, port, payload }) => { const endpoint: PeerEndpoint = { peerId: host, ipAddress: host, port, status: 'connected', lastSeenAt: Date.now() }; this.peers.set(host, endpoint); this.emit({ type: 'peer', peer: endpoint }); this.emit({ type: 'message', message: { from: endpoint, bytes: new TextEncoder().encode(payload), receivedAt: Date.now() } }); }),
    ];
    NativeWifiDirect.startUdp(9000);
    NativeWifiDirect.startDiscovery();
  }
  async stop(): Promise<void> { NativeWifiDirect.stopUdp(); NativeWifiDirect.stopDiscovery(); this.subscriptions.forEach((item) => item.remove()); this.subscriptions = []; this.emit({ type: 'status', status: 'stopped' }); }
  async connect(peerId: string): Promise<void> { NativeWifiDirect.connect(peerId); }
  async disconnect(_peerId: string): Promise<void> { NativeWifiDirect.disconnect(); }
  async send(peerId: string, bytes: Uint8Array): Promise<void> { const peer = this.peers.get(peerId); const host = peer?.ipAddress ?? this.groupOwnerAddress; if (!host) throw new Error('Peer IP is unavailable until peer information is exchanged.'); NativeWifiDirect.sendUdp(host, peer?.port ?? 9000, new TextDecoder().decode(bytes)); }
  async broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void> { const recipients = [...this.peers.values()].filter((peer) => peer.peerId !== exceptPeerId); if (!recipients.length && this.groupOwnerAddress) { NativeWifiDirect.sendUdp(this.groupOwnerAddress, 9000, new TextDecoder().decode(bytes)); return; } await Promise.all(recipients.map((peer) => this.send(peer.peerId, bytes))); }
  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }
  subscribe(listener: (event: TransportEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private recordPeer(peer: Peer): void { const endpoint = { peerId: peer.deviceAddress, displayName: peer.deviceName, status: peer.status, lastSeenAt: Date.now() } as PeerEndpoint; this.peers.set(endpoint.peerId, endpoint); this.emit({ type: 'peer', peer: endpoint }); }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}
