import { Permission, PermissionsAndroid, Platform } from 'react-native';
import NativeNearby, { NearbyPeer } from '../../../modules/mirage-nearby-transport';
import { PeerEndpoint, PeerTransport, TransportEvent } from '../../../../backend/src/transport/PeerTransport';

/** Google Nearby Connections link adapter. Mesh routing and crypto stay above this layer. */
export class NearbyConnectionsTransport implements PeerTransport {
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  private readonly endpointAliases = new Map<string, string>();
  private readonly subscriptions: Array<{ remove(): void }> = [];
  private readonly pendingSends = new Map<string, { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  private sendSequence = 0;

  constructor(private readonly endpointName: string) {}

  async start(): Promise<void> {
    this.emit({ type: 'status', status: 'starting' });
    await this.requestPermissions();
    if (!NativeNearby.isSupported()) throw new Error('Google Play services with Nearby Connections is unavailable on this phone.');
    this.subscriptions.push(
      NativeNearby.addListener('onStatus', ({ status }) => {
        if (status === 'ready') this.emit({ type: 'status', status: 'ready' });
        if (status === 'stopped') this.emit({ type: 'status', status: 'stopped' });
      }),
      NativeNearby.addListener('onPeer', (peer: NearbyPeer) => this.recordPeer(peer)),
      NativeNearby.addListener('onError', ({ message }) => this.emit({ type: 'error', error: new Error(message) })),
      NativeNearby.addListener('onConnection', ({ groupFormed }) => this.emit({ type: 'group', groupFormed, isGroupOwner: false })),
      NativeNearby.addListener('onPacket', ({ endpointId, payload }) => {
        const source = this.connectedEndpoint(endpointId);
        this.emit({ type: 'message', message: { from: source, bytes: new TextEncoder().encode(payload), receivedAt: Date.now() } });
      }),
      NativeNearby.addListener('onSendResult', ({ requestId, success, error }) => {
        const pending = this.pendingSends.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pendingSends.delete(requestId);
        if (success) pending.resolve(); else pending.reject(new Error(error ?? 'Nearby send failed.'));
      }),
    );
    NativeNearby.start(this.endpointName);
  }

  async stop(): Promise<void> {
    NativeNearby.stop();
    this.subscriptions.splice(0).forEach((subscription) => subscription.remove());
    this.rejectPendingSends(new Error('Nearby transport stopped before the send completed.'));
    this.peers.clear();
    this.endpointAliases.clear();
    this.emit({ type: 'status', status: 'stopped' });
  }

  async connect(peerId: string): Promise<void> { NativeNearby.connect(this.endpointFor(peerId)); }
  async disconnect(peerId: string): Promise<void> { NativeNearby.disconnect(this.endpointFor(peerId)); }

  send(peerId: string, bytes: Uint8Array): Promise<void> {
    const endpointId = this.endpointFor(peerId);
    const requestId = `nearby-${Date.now()}-${++this.sendSequence}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingSends.delete(requestId);
        reject(new Error(`Nearby send to ${peerId} timed out.`));
      }, 10_000);
      this.pendingSends.set(requestId, { resolve, reject, timeout });
      try {
        NativeNearby.send(endpointId, new TextDecoder().decode(bytes), requestId);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingSends.delete(requestId);
        reject(error instanceof Error ? error : new Error('Unable to start Nearby send.'));
      }
    });
  }

  async broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void> {
    const excludedEndpoint = exceptPeerId ? this.endpointFor(exceptPeerId) : undefined;
    const endpoints = new Set(
      [...this.peers.values()]
        .filter((peer) => peer.status === 'connected' && peer.ipAddress && peer.ipAddress !== excludedEndpoint)
        .map((peer) => peer.ipAddress!),
    );
    if (!endpoints.size) throw new Error('No connected Nearby peer is available.');
    await Promise.all([...endpoints].map((endpointId) => this.send(endpointId, bytes)));
  }

  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }

  rememberPeerEndpoint(peerId: string, endpointId: string, _port: number, displayName?: string): void {
    const previousId = this.endpointAliases.get(endpointId) ?? endpointId;
    const previous = this.peers.get(previousId) ?? this.peers.get(endpointId);
    const mappingUnchanged = previousId === peerId
      && previous?.ipAddress === endpointId
      && previous.status === 'connected'
      && (displayName === undefined || displayName === previous.displayName);
    this.peers.delete(previousId);
    this.peers.delete(endpointId);
    this.endpointAliases.set(endpointId, peerId);
    const endpoint: PeerEndpoint = {
      peerId,
      displayName: displayName ?? previous?.displayName,
      ipAddress: endpointId,
      port: 0,
      status: 'connected',
      lastSeenAt: Date.now(),
    };
    this.peers.set(peerId, endpoint);
    // Avoid a PEER_INFO ping-pong: an unchanged mapping must not look like a
    // newly connected peer to the announcement subscriber.
    if (!mappingUnchanged) this.emit({ type: 'peer', peer: endpoint });
  }

  subscribe(listener: (event: TransportEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS !== 'android') throw new Error('Nearby Connections is available only in the Android apps.');
    const version = typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(String(Platform.Version), 10);
    const permissions: Permission[] = version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          ...(version >= 33 ? [PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]),
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    const denied = permissions.filter((permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED);
    if (denied.length) throw new Error('Allow Nearby devices, Bluetooth and precise Location permissions so phones can relay SOS messages.');
  }

  private recordPeer(peer: NearbyPeer): void {
    const publicId = this.endpointAliases.get(peer.endpointId) ?? peer.endpointId;
    const previous = this.peers.get(publicId);
    const endpoint: PeerEndpoint = {
      peerId: publicId,
      displayName: previous?.displayName ?? peer.endpointName,
      ipAddress: peer.endpointId,
      port: 0,
      status: peer.status,
      lastSeenAt: Date.now(),
    };
    this.peers.set(publicId, endpoint);
    this.emit({ type: 'peer', peer: endpoint });
  }

  private connectedEndpoint(endpointId: string): PeerEndpoint {
    const publicId = this.endpointAliases.get(endpointId) ?? endpointId;
    const existing = this.peers.get(publicId);
    if (existing?.status === 'connected') return existing;
    const endpoint: PeerEndpoint = {
      peerId: publicId,
      displayName: existing?.displayName ?? 'Nearby Mirage device',
      ipAddress: endpointId,
      port: 0,
      status: 'connected',
      lastSeenAt: Date.now(),
    };
    this.peers.set(publicId, endpoint);
    this.emit({ type: 'peer', peer: endpoint });
    return endpoint;
  }

  private endpointFor(peerId: string): string { return this.peers.get(peerId)?.ipAddress ?? peerId; }
  private rejectPendingSends(error: Error): void {
    for (const pending of this.pendingSends.values()) { clearTimeout(pending.timeout); pending.reject(error); }
    this.pendingSends.clear();
  }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}
