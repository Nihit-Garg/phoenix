/** Shared contract implemented by the future Android Wi-Fi Direct + UDP transport. */
export type PeerStatus = 'discovered' | 'connecting' | 'connected' | 'disconnected';

export interface PeerEndpoint {
  peerId: string;
  displayName?: string;
  ipAddress?: string;
  port?: number;
  status: PeerStatus;
  lastSeenAt: number;
}

export interface IncomingTransportMessage {
  from: PeerEndpoint;
  bytes: Uint8Array;
  receivedAt: number;
}

export type TransportStatus = 'starting' | 'ready' | 'stopped' | 'unavailable';

export type TransportEvent =
  | { type: 'peer'; peer: PeerEndpoint }
  | { type: 'message'; message: IncomingTransportMessage }
  | { type: 'error'; error: Error }
  | { type: 'status'; status: TransportStatus };

export interface PeerTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  connect(peerId: string): Promise<void>;
  disconnect(peerId: string): Promise<void>;
  send(peerId: string, bytes: Uint8Array): Promise<void>;
  broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void>;
  getPeers(): readonly PeerEndpoint[];
  subscribe(listener: (event: TransportEvent) => void): () => void;
}

/** A safe Phase 2 placeholder: it exposes lifecycle semantics but performs no I/O. */
export class UnavailableTransport implements PeerTransport {
  private listeners = new Set<(event: TransportEvent) => void>();
  private started = false;

  async start(): Promise<void> {
    this.started = true;
    this.emit({ type: 'status', status: 'starting' });
    this.emit({ type: 'status', status: 'unavailable' });
  }

  async stop(): Promise<void> {
    this.started = false;
    this.emit({ type: 'status', status: 'stopped' });
  }

  async connect(_peerId: string): Promise<void> { this.unavailable(); }
  async disconnect(_peerId: string): Promise<void> { this.unavailable(); }
  async send(_peerId: string, _bytes: Uint8Array): Promise<void> { this.unavailable(); }
  async broadcast(_bytes: Uint8Array, _exceptPeerId?: string): Promise<void> { this.unavailable(); }
  getPeers(): readonly PeerEndpoint[] { return []; }
  subscribe(listener: (event: TransportEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private unavailable(): never {
    const error = new Error('Wi-Fi Direct and UDP transport are not configured yet.');
    this.emit({ type: 'error', error });
    throw error;
  }

  private emit(event: TransportEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

/**
 * A deterministic, process-local transport for routing and protocol tests.
 * It is deliberately not exported or used by either app at runtime: it does
 * not discover devices, create Wi-Fi Direct groups, or open UDP sockets.
 */
export class InMemoryTransport implements PeerTransport {
  private static readonly instances = new Map<string, InMemoryTransport>();
  private readonly listeners = new Set<(event: TransportEvent) => void>();
  private readonly peers = new Map<string, PeerEndpoint>();
  private started = false;

  constructor(
    private readonly self: Omit<PeerEndpoint, 'status' | 'lastSeenAt'>,
    private readonly now: () => number = Date.now,
  ) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.emit({ type: 'status', status: 'starting' });
    InMemoryTransport.instances.set(this.self.peerId, this);
    this.emit({ type: 'status', status: 'ready' });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    InMemoryTransport.instances.delete(this.self.peerId);
    for (const peer of this.peers.values()) this.emit({ type: 'peer', peer: { ...peer, status: 'disconnected' } });
    this.peers.clear();
    this.emit({ type: 'status', status: 'stopped' });
  }

  async connect(peerId: string): Promise<void> {
    this.requireStarted();
    const target = InMemoryTransport.instances.get(peerId);
    if (!target) throw new Error(`In-memory peer ${peerId} is not available.`);
    const connecting = this.endpointFor(target, 'connecting');
    this.peers.set(peerId, connecting);
    this.emit({ type: 'peer', peer: connecting });
    const connected = this.endpointFor(target, 'connected');
    this.peers.set(peerId, connected);
    this.emit({ type: 'peer', peer: connected });
  }

  async disconnect(peerId: string): Promise<void> {
    this.requireStarted();
    const peer = this.peers.get(peerId);
    if (!peer) return;
    const disconnected = { ...peer, status: 'disconnected' as const, lastSeenAt: this.now() };
    this.peers.delete(peerId);
    this.emit({ type: 'peer', peer: disconnected });
  }

  async send(peerId: string, bytes: Uint8Array): Promise<void> {
    this.requireStarted();
    const target = InMemoryTransport.instances.get(peerId);
    const peer = this.peers.get(peerId);
    if (!target || !peer || peer.status !== 'connected') throw new Error(`In-memory peer ${peerId} is not connected.`);
    target.receive(this.endpointForSelf(), bytes);
  }

  async broadcast(bytes: Uint8Array, exceptPeerId?: string): Promise<void> {
    const recipients = [...this.peers.values()].filter((peer) => peer.status === 'connected' && peer.peerId !== exceptPeerId);
    await Promise.all(recipients.map((peer) => this.send(peer.peerId, bytes)));
  }

  getPeers(): readonly PeerEndpoint[] { return [...this.peers.values()]; }

  subscribe(listener: (event: TransportEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private endpointFor(target: InMemoryTransport, status: PeerStatus): PeerEndpoint {
    return { ...target.self, status, lastSeenAt: this.now() };
  }

  private endpointForSelf(): PeerEndpoint {
    return { ...this.self, status: 'connected', lastSeenAt: this.now() };
  }

  private receive(from: PeerEndpoint, bytes: Uint8Array): void {
    this.emit({ type: 'message', message: { from, bytes: new Uint8Array(bytes), receivedAt: this.now() } });
  }

  private requireStarted(): void {
    if (!this.started) throw new Error('In-memory transport must be started before use.');
  }

  private emit(event: TransportEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
