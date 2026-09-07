/**
 * frontend/src/engine/MeshEngine.ts
 *
 * Top-level orchestrator for the Mirage protocol.
 *
 * Singleton — instantiated once per app session.
 * Connects all subsystems: RTCManager, PacketRouter, HeartbeatManager,
 * DuplicateCache, SCFQueue, PacketBuilder.
 *
 * Exposes a typed event emitter so Zustand stores (Dev 3) can subscribe
 * without importing engine internals.
 *
 * Public API (consumed by useMeshEngine hook — Dev 3):
 *   meshEngine.initialize(localNodeId, displayName, signalingClient)
 *   meshEngine.destroy()
 *   meshEngine.sendPacket(destId, text, priority?)
 *   meshEngine.sendEmergency(text, severity)
 *   meshEngine.on('peer-connected',    handler)
 *   meshEngine.on('peer-disconnected', handler)
 *   meshEngine.on('packet-received',   handler)
 *   meshEngine.on('packet-forwarded',  handler)
 *   meshEngine.on('packet-queued',     handler)
 *   meshEngine.on('packet-delivered',  handler)
 *   meshEngine.on('route-updated',     handler)
 *   meshEngine.on('emergency',         handler)
 *
 * See: ARCHITECTURE.md § 2.4 MeshEngine (Core)
 */

import { SignalingClient, NodeSummary } from '../lib/signaling';
import { RTCManager }        from './RTCManager';
import { PacketRouter }      from './PacketRouter';
import { PacketBuilder }     from './PacketBuilder';
import { DuplicateCache }    from './DuplicateCache';
import { SCFQueue }          from './SCFQueue';
import { HeartbeatManager }  from './HeartbeatManager';
import {
  MiragePacket, MirageNode, EmergencyPayload, PacketPriority,
  QueueEntry, EmergencyMarker, RoutingEntry, BROADCAST_ADDRESS,
} from './types';

// ─── Event map ────────────────────────────────────────────────────────────────

interface MeshEngineEvents {
  'peer-connected':    (node: MirageNode)         => void;
  'peer-disconnected': (nodeId: string)            => void;
  'packet-received':   (packet: MiragePacket)      => void;
  'packet-forwarded':  (packet: MiragePacket)      => void;
  'packet-queued':     (entry: QueueEntry)         => void;
  'packet-dequeued':   (entry: QueueEntry)         => void;
  'packet-delivered':  (packet: MiragePacket)      => void;
  'route-updated':     (table: RoutingEntry[])     => void;
  'emergency':         (marker: EmergencyMarker)   => void;
}

type EventKey = keyof MeshEngineEvents;

// ─── MeshEngine class ──────────────────────────────────────────────────────────

class MeshEngineClass {
  private localNodeId   = '';
  private displayName   = '';
  private peers         = new Map<string, MirageNode>();

  private rtc      = new RTCManager();
  private router   = new PacketRouter();
  private cache    = new DuplicateCache();
  private scfQueue = new SCFQueue();
  private hbm      = new HeartbeatManager();

  private listeners = new Map<EventKey, Set<(...args: any[]) => void>>();

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async initialize(
    localNodeId: string,
    displayName: string,
    signalingClient: SignalingClient,
  ): Promise<void> {
    this.localNodeId = localNodeId;
    this.displayName = displayName;

    if (!this.rtc.isSupported()) {
      throw new Error('WebRTC is not available on this platform.');
    }

    this.router.init(localNodeId);
    await this.scfQueue.hydrate();
    for (const entry of this.scfQueue.getAll()) this.emit('packet-queued', entry);

    // Wire RTCManager
    this.rtc.init({
      sigClient:   signalingClient,
      localNodeId,
      onMessage:   (fromNodeId, raw) => this._handleRawMessage(fromNodeId, raw),
      onOpen:      (peer)            => this._handlePeerOpen(peer),
      onClose:     (nodeId)          => this._handlePeerClose(nodeId),
    });

    // Wire HeartbeatManager
    this.hbm.init({
      sendHeartbeat:  (destId, seq, depth) => {
        const pkt = PacketBuilder.heartbeat(localNodeId, destId, seq, depth);
        this._sendViaDC(destId, pkt);
      },
      onDead:         (nodeId) => this._handleDeadPeer(nodeId),
      onSuspect:      (nodeId) => this._updatePeerStatus(nodeId, 'suspect'),
      getQueueDepth:  ()       => this.scfQueue.depth,
    });

    // Wire signaling — peer discovery
    signalingClient.onPeerList = async (peers: NodeSummary[]) => {
      for (const peer of peers) await this._connectIfInitiator(peer);
    };

    signalingClient.onNewPeer = async (peer: NodeSummary) => {
      await this._connectIfInitiator(peer);
    };

    this.hbm.start();
  }

  destroy(): void {
    this.hbm.clear();
    this.rtc.destroy();
    this.router.clear();
    this.cache.clear();
    this.peers.clear();
  }

  /**
   * Both sides learn about a join: the newcomer gets `peer-list` and existing
   * nodes get `new-peer`. Elect one offerer from the stable node IDs so the two
   * browsers do not create concurrent offers (WebRTC offer glare).
   */
  private async _connectIfInitiator(peer: NodeSummary): Promise<void> {
    if (this.localNodeId.localeCompare(peer.nodeId) < 0) {
      await this.rtc.connectToPeer(peer);
    }
  }

  // ─── Public send API ─────────────────────────────────────────────────────────

  sendPacket(destId: string, text: string, priority: PacketPriority = 'NORMAL'): void {
    const packet = PacketBuilder.data(this.localNodeId, destId, text, priority);
    if (this.cache.has(packet.packetId)) return;
    this.cache.add(packet.packetId);
    this._routeAndSend(packet, false);
  }

  sendEmergency(text: string, severity: EmergencyPayload['severity']): void {
    const packet = PacketBuilder.emergency(this.localNodeId, text, severity);
    if (this.cache.has(packet.packetId)) return;
    this.cache.add(packet.packetId);
    this.emit('emergency', this._toEmergencyMarker(packet));
    this._broadcastPacket(packet, false);
  }

  // ─── Event emitter ───────────────────────────────────────────────────────────

  on<K extends EventKey>(event: K, handler: MeshEngineEvents[K]): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as any);
  }

  off<K extends EventKey>(event: K, handler: MeshEngineEvents[K]): void {
    this.listeners.get(event)?.delete(handler as any);
  }

  private emit<K extends EventKey>(event: K, ...args: Parameters<MeshEngineEvents[K]>): void {
    for (const handler of this.listeners.get(event) ?? []) {
      handler(...(args as any[]));
    }
  }

  // ─── Routing ─────────────────────────────────────────────────────────────────

  private _routeAndSend(packet: MiragePacket, isForwarding: boolean): void {
    if (packet.destId === BROADCAST_ADDRESS) {
      this._broadcastPacket(packet, isForwarding);
      return;
    }

    const route = this.router.getNextHop(packet.destId);
    if (!route) {
      const entry = this.scfQueue.enqueue(packet);
      this.emit('packet-queued', entry);
      return;
    }

    if (isForwarding && packet.ttl <= 1) return;
    const outbound = isForwarding ? PacketBuilder.forwardCopy(packet, this.localNodeId) : packet;
    if (!this._sendViaDC(route.nextHopId, outbound)) {
      const entry = this.scfQueue.enqueue(packet);
      this.emit('packet-queued', entry);
      return;
    }
    this.emit('packet-forwarded', outbound);
  }

  private _broadcastPacket(packet: MiragePacket, isForwarding: boolean, fromNodeId?: string): void {
    if (isForwarding && packet.ttl <= 1) return;
    const outbound = isForwarding ? PacketBuilder.forwardCopy(packet, this.localNodeId) : packet;
    this.rtc.broadcast(JSON.stringify(outbound), fromNodeId);
    this.emit('packet-forwarded', outbound);
  }

  private _sendViaDC(destNodeId: string, packet: MiragePacket): boolean {
    return this.rtc.send(destNodeId, JSON.stringify(packet));
  }

  // ─── Inbound packet processing ────────────────────────────────────────────────

  private _handleRawMessage(fromNodeId: string, raw: string): void {
    let packet: MiragePacket;
    try { packet = JSON.parse(raw) as MiragePacket; }
    catch { return; }

    if (this.cache.isDuplicate(packet.packetId)) return;
    this.emit('packet-received', packet);

    switch (packet.type) {
      case 'DATA':          return this._handleData(packet);
      case 'HELLO':         return this._handleHello(fromNodeId, packet);
      case 'HEARTBEAT':     return this._handleHeartbeat(fromNodeId, packet);
      case 'HEARTBEAT_ACK': return this._handleHeartbeatAck(fromNodeId, packet);
      case 'EMERGENCY':     return this._handleEmergency(packet);
      case 'ROUTE_UPDATE':  return this._handleRouteUpdate(fromNodeId, packet);
      case 'LEAVE':         return this._handleLeave(fromNodeId);
      default:              break;
    }
  }

  private _handleData(packet: MiragePacket): void {
    if (packet.destId === this.localNodeId) {
      // Delivered to us
      this.emit('packet-delivered', packet);
      return;
    }
    // Forward — TTL check
    if (packet.ttl <= 1) return;
    this._routeAndSend(packet, true);
  }

  private _handleHello(fromNodeId: string, packet: MiragePacket): void {
    const payload = packet.payload as any;
    const routes: RoutingEntry[] = payload.routingTable ?? [];
    const changed = this.router.mergeRoutes(fromNodeId, routes);

    if (changed) {
      this.emit('route-updated', this.router.getTable());
      this._drainRoutableQueue();
      this._announceRoutes(fromNodeId);
    }

    const peer = this.peers.get(fromNodeId);
    if (peer && peer.displayName !== payload.displayName) {
      peer.displayName = payload.displayName;
      this.emit('peer-connected', { ...peer });
    }
  }

  private _handleHeartbeat(fromNodeId: string, packet: MiragePacket): void {
    const payload = packet.payload as any;
    const ack = PacketBuilder.heartbeatAck(this.localNodeId, fromNodeId, payload.sequence);
    this._sendViaDC(fromNodeId, ack);

    // Update peer queueDepth info
    const peer = this.peers.get(fromNodeId);
    if (peer) { peer.queueDepth = payload.queueDepth ?? null; peer.lastSeenAt = Date.now(); }
  }

  private _handleHeartbeatAck(fromNodeId: string, packet: MiragePacket): void {
    const payload = packet.payload as any;
    this.hbm.ackReceived(fromNodeId, payload.echoSequence);
    const peer = this.peers.get(fromNodeId);
    if (peer) { peer.status = 'alive'; peer.lastSeenAt = Date.now(); }
  }

  private _handleEmergency(packet: MiragePacket): void {
    const payload = packet.payload as any;
    this.emit('emergency', this._toEmergencyMarker(packet));
    // Rebroadcast to all other peers. The packet was already admitted to the
    // duplicate cache by _handleRawMessage, so do not check it a second time.
    this._broadcastPacket(packet, true, packet.senderId);
  }

  private _handleRouteUpdate(fromNodeId: string, packet: MiragePacket): void {
    const payload = packet.payload as any;
    const changed = this.router.mergeRoutes(fromNodeId, payload.routes ?? []);
    if (changed) {
      this.emit('route-updated', this.router.getTable());
      this._drainRoutableQueue();
      this._announceRoutes(fromNodeId);
    }
  }

  private _handleLeave(fromNodeId: string): void {
    this._handleDeadPeer(fromNodeId);
  }

  // ─── Peer lifecycle ───────────────────────────────────────────────────────────

  private _handlePeerOpen(peer: NodeSummary): void {
    const node: MirageNode = {
      nodeId:          peer.nodeId,
      displayName:     peer.displayName,
      socketId:        peer.socketId,
      status:          'alive',
      lastSeenAt:      Date.now(),
      queueDepth:      null,
      protocolVersion: '1.0',
    };
    this.peers.set(peer.nodeId, node);
    this.hbm.addPeer(peer.nodeId);
    const routeChanged = this.router.addDirectPeer(peer.nodeId);

    // Send HELLO immediately on channel open
    const hello = PacketBuilder.hello(
      this.localNodeId, peer.nodeId,
      this.displayName, this.router.getTable()
    );
    this._sendViaDC(peer.nodeId, hello);

    this.emit('peer-connected', node);
    if (routeChanged) {
      this.emit('route-updated', this.router.getTable());
      this._drainRoutableQueue();
      this._announceRoutes();
    }
  }

  private _handlePeerClose(nodeId: string): void {
    this._handleDeadPeer(nodeId);
  }

  private _handleDeadPeer(nodeId: string): void {
    const existed = this.peers.has(nodeId);
    this.peers.delete(nodeId);
    this.hbm.removePeer(nodeId);

    const changed = this.router.removePeer(nodeId);
    if (changed) this.emit('route-updated', this.router.getTable());

    if (existed) this.emit('peer-disconnected', nodeId);
  }

  private _updatePeerStatus(nodeId: string, status: MirageNode['status']): void {
    const peer = this.peers.get(nodeId);
    if (peer) {
      peer.status = status;
      this.emit('peer-connected', { ...peer });
    }
  }

  private _announceRoutes(excludedNodeId?: string): void {
    const routes = this.router.getTable();
    for (const nodeId of this.rtc.getConnectedPeerIds()) {
      if (nodeId === excludedNodeId) continue;
      const update = PacketBuilder.routeUpdate(this.localNodeId, nodeId, routes);
      this._sendViaDC(nodeId, update);
    }
  }

  private _drainRoutableQueue(): void {
    const drained = this.scfQueue.drainRoutable((id) => this.router.hasRoute(id));
    for (const entry of drained) {
      this.emit('packet-dequeued', entry);
      this._routeAndSend(entry.packet, false);
    }
  }

  private _toEmergencyMarker(packet: MiragePacket): EmergencyMarker {
    const payload = packet.payload as EmergencyPayload;
    return {
      packetId: packet.packetId,
      originId: packet.originId,
      text: payload.text,
      severity: payload.severity,
      receivedAt: Date.now(),
    };
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

export const meshEngine = new MeshEngineClass();
