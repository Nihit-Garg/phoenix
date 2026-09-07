export type PeerStatus = 'discovered' | 'connecting' | 'connected' | 'disconnected';
export interface PeerEndpoint { peerId: string; displayName?: string; ipAddress?: string; port?: number; status: PeerStatus; lastSeenAt: number; }
export interface IncomingTransportMessage { from: PeerEndpoint; bytes: Uint8Array; receivedAt: number; }
export type TransportStatus = 'starting' | 'ready' | 'stopped' | 'unavailable';
export type TransportEvent =
  | { type: 'peer'; peer: PeerEndpoint } | { type: 'message'; message: IncomingTransportMessage }
  | { type: 'error'; error: Error } | { type: 'status'; status: TransportStatus };
export interface PeerTransport {
  start(): Promise<void>; stop(): Promise<void>; connect(peerId: string): Promise<void>; disconnect(peerId: string): Promise<void>;
  send(peerId: string, bytes: Uint8Array): Promise<void>; broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void>;
  getPeers(): readonly PeerEndpoint[]; subscribe(listener: (event: TransportEvent) => void): () => void;
}

/** Runtime guard until the Android Wi-Fi Direct + UDP native adapter is installed. */
export class UnavailableTransport implements PeerTransport {
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  async start(): Promise<void> { this.emit({ type: 'status', status: 'starting' }); this.emit({ type: 'status', status: 'unavailable' }); }
  async stop(): Promise<void> { this.emit({ type: 'status', status: 'stopped' }); }
  async connect(_peerId: string): Promise<void> { return this.fail(); }
  async disconnect(_peerId: string): Promise<void> { return this.fail(); }
  async send(_peerId: string, _bytes: Uint8Array): Promise<void> { return this.fail(); }
  async broadcast(_bytes: Uint8Array, _exceptPeerId?: string): Promise<void> { return this.fail(); }
  getPeers(): readonly PeerEndpoint[] { return []; }
  subscribe(listener: (event: TransportEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private fail(): never { const error = new Error('Wi-Fi Direct and UDP transport are not configured yet.'); this.emit({ type: 'error', error }); throw error; }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}

/** Deterministic process-local test double. It is never a substitute for Wi-Fi Direct. */
export class InMemoryTransport implements PeerTransport {
  private static readonly instances = new Map<string, InMemoryTransport>();
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  constructor(private readonly self: Omit<PeerEndpoint, 'status' | 'lastSeenAt'>, private readonly now: () => number = Date.now) {}
  async start(): Promise<void> { InMemoryTransport.instances.set(this.self.peerId, this); this.emit({ type: 'status', status: 'ready' }); }
  async stop(): Promise<void> { InMemoryTransport.instances.delete(this.self.peerId); this.peers.clear(); this.emit({ type: 'status', status: 'stopped' }); }
  async connect(peerId: string): Promise<void> {
    const target = InMemoryTransport.instances.get(peerId); if (!target) throw new Error(`In-memory peer ${peerId} is not available.`);
    const peer = { ...target.self, status: 'connected' as const, lastSeenAt: this.now() }; this.peers.set(peerId, peer); this.emit({ type: 'peer', peer });
  }
  async disconnect(peerId: string): Promise<void> { const peer = this.peers.get(peerId); this.peers.delete(peerId); if (peer) this.emit({ type: 'peer', peer: { ...peer, status: 'disconnected', lastSeenAt: this.now() } }); }
  async send(peerId: string, bytes: Uint8Array): Promise<void> {
    const target = InMemoryTransport.instances.get(peerId); if (!target || !this.peers.has(peerId)) throw new Error(`In-memory peer ${peerId} is not connected.`);
    target.emit({ type: 'message', message: { from: { ...this.self, status: 'connected', lastSeenAt: this.now() }, bytes: new Uint8Array(bytes), receivedAt: this.now() } });
  }
  async broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void> { await Promise.all([...this.peers.keys()].filter((id) => id !== exceptPeerId).map((id) => this.send(id, bytes))); }
  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }
  subscribe(listener: (event: TransportEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(event: TransportEvent): void { for (const listener of this.listeners) listener(event); }
}
