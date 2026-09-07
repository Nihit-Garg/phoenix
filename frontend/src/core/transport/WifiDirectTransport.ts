import { PermissionsAndroid, Platform } from 'react-native';
import NativeWifiDirect, { Peer } from '../../../modules/mirage-peer-transport';
import { PeerEndpoint, PeerTransport, TransportEvent } from '../../../../backend/src/transport/PeerTransport';

/** Wi-Fi Direct discovery and UDP packet adapter for Android development builds. */
export class WifiDirectTransport implements PeerTransport {
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  private subscriptions: Array<{ remove(): void }> = [];
  private groupOwnerAddress?: string;
  private sendSequence = 0;
  private readonly pendingSends = new Map<string, { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  async start(): Promise<void> {
    this.emit({ type: 'status', status: 'starting' });
    const permission = typeof Platform.Version === 'number' && Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    if ((await PermissionsAndroid.request(permission)) !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Nearby Wi-Fi permission is required for peer discovery.');
    if (!NativeWifiDirect.isSupported()) throw new Error('Wi-Fi Direct is not supported on this phone.');
    this.subscriptions = [
      NativeWifiDirect.addListener('onStatus', ({ status }) => {
        if (status === 'disabled') this.emit({ type: 'status', status: 'unavailable' });
      }),
      NativeWifiDirect.addListener('onPeer', (peer: Peer) => this.recordPeer(peer)),
      NativeWifiDirect.addListener('onError', ({ message }) => this.emit({ type: 'error', error: new Error(message) })),
      NativeWifiDirect.addListener('onConnection', ({ groupOwnerAddress, isGroupOwner, groupFormed }) => {
        this.groupOwnerAddress = !isGroupOwner ? groupOwnerAddress ?? undefined : undefined;
        if (groupOwnerAddress && !isGroupOwner) this.recordConnectedEndpoint(groupOwnerAddress, 9000);
        this.emit({ type: 'group', groupFormed, isGroupOwner, groupOwnerAddress: groupOwnerAddress ?? undefined });
      }),
      NativeWifiDirect.addListener('onPacket', ({ host, port, payload }) => { const endpoint = this.recordConnectedEndpoint(host, port); this.emit({ type: 'message', message: { from: endpoint, bytes: new TextEncoder().encode(payload), receivedAt: Date.now() } }); }),
      NativeWifiDirect.addListener('onSendResult', ({ requestId, success, error }) => {
        const pending = this.pendingSends.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pendingSends.delete(requestId);
        if (success) pending.resolve(); else pending.reject(new Error(error ?? 'UDP send failed.'));
      }),
    ];
    if (!NativeWifiDirect.startUdp(9000)) throw new Error('UDP port 9000 could not be opened.');
    NativeWifiDirect.startDiscovery();
    this.emit({ type: 'status', status: 'ready' });
  }
  async stop(): Promise<void> { NativeWifiDirect.stopUdp(); NativeWifiDirect.stopDiscovery(); this.subscriptions.forEach((item) => item.remove()); this.subscriptions = []; this.rejectPendingSends(new Error('Nearby transport stopped before UDP send completed.')); this.peers.clear(); this.groupOwnerAddress = undefined; this.emit({ type: 'status', status: 'stopped' }); }
  async connect(peerId: string): Promise<void> { const peer = this.peers.get(peerId); if (peer) { const connecting = { ...peer, status: 'connecting' as const, lastSeenAt: Date.now() }; this.peers.set(peerId, connecting); this.emit({ type: 'peer', peer: connecting }); } NativeWifiDirect.connect(peerId, 0); }
  async createRelayGroup(): Promise<void> { NativeWifiDirect.createGroup(); }
  async disconnect(_peerId: string): Promise<void> { NativeWifiDirect.disconnect(); }
  async send(peerId: string, bytes: Uint8Array): Promise<void> { const peer = this.peers.get(peerId); const host = peer?.ipAddress ?? this.groupOwnerAddress; if (!host) throw new Error('Peer IP is unavailable until peer information is exchanged.'); await this.sendDatagram(host, peer?.port ?? 9000, new TextDecoder().decode(bytes)); }
  async broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void> { const excludedIp = exceptPeerId ? this.peers.get(exceptPeerId)?.ipAddress ?? exceptPeerId : undefined; const recipients = [...this.peers.values()].filter((peer) => peer.peerId !== exceptPeerId && peer.ipAddress && peer.ipAddress !== excludedIp); if (!recipients.length && this.groupOwnerAddress && this.groupOwnerAddress !== excludedIp) { await this.sendDatagram(this.groupOwnerAddress, 9000, new TextDecoder().decode(bytes)); return; } if (!recipients.length) throw new Error('No connected peer has a reachable UDP endpoint.'); const uniqueRecipients = [...new Map(recipients.map((peer) => [peer.ipAddress, peer])).values()]; await Promise.all(uniqueRecipients.map((peer) => this.send(peer.peerId, bytes))); }
  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }
  rememberPeerEndpoint(peerId: string, ipAddress: string, port: number, displayName?: string): void { const previous = this.peers.get(peerId); this.peers.delete(ipAddress); const endpoint: PeerEndpoint = { peerId, displayName, ipAddress, port, status: 'connected', lastSeenAt: Date.now() }; this.peers.set(peerId, endpoint); if (!previous || previous.ipAddress !== ipAddress || previous.port !== port || previous.status !== 'connected') this.emit({ type: 'peer', peer: endpoint }); }
  subscribe(listener: (event: TransportEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private recordPeer(peer: Peer): void { const endpoint = { peerId: peer.deviceAddress, displayName: peer.deviceName, status: peer.status, lastSeenAt: Date.now() } as PeerEndpoint; this.peers.set(endpoint.peerId, endpoint); this.emit({ type: 'peer', peer: endpoint }); }
  private recordConnectedEndpoint(host: string, port: number): PeerEndpoint {
    const previous = this.peers.get(host);
    const endpoint: PeerEndpoint = { peerId: host, ipAddress: host, port, status: 'connected', lastSeenAt: Date.now() };
    this.peers.set(host, endpoint);
    if (!previous || previous.status !== 'connected' || previous.ipAddress !== host || previous.port !== port) this.emit({ type: 'peer', peer: endpoint });
    return endpoint;
  }
  private sendDatagram(host: string, port: number, payload: string): Promise<void> {
    const requestId = `udp-${Date.now()}-${++this.sendSequence}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pendingSends.delete(requestId); reject(new Error(`UDP send to ${host}:${port} timed out.`)); }, 5000);
      this.pendingSends.set(requestId, { resolve, reject, timeout });
      try { NativeWifiDirect.sendUdp(host, port, payload, requestId); }
      catch (error) { clearTimeout(timeout); this.pendingSends.delete(requestId); reject(error instanceof Error ? error : new Error('Unable to start UDP send.')); }
    });
  }
  private rejectPendingSends(error: Error): void { for (const pending of this.pendingSends.values()) { clearTimeout(pending.timeout); pending.reject(error); } this.pendingSends.clear(); }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}
