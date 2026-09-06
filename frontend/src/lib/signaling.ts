/**
 * src/lib/signaling.ts
 *
 * Browser/RN-side Socket.IO client for the MIRAGE signaling server.
 *
 * Implements the SignalingClient interface defined in TEAM_ASSIGNMENT.md (Dev 2).
 * The server's event shapes are defined by the backend handlers (navya-dev).
 *
 * ─── Server → Client events ─────────────────────────────────────────────────
 *   peer-list       { peers: NodeSummary[] }
 *   new-peer        { peer: NodeSummary }
 *   peer-left       { nodeId, socketId, reason }
 *   offer           { fromSocketId, fromNodeId, sdp }
 *   answer          { fromSocketId, fromNodeId, sdp }
 *   ice-candidate   { fromSocketId, fromNodeId, candidate }
 *   signaling-error { code, message, context? }
 *
 * ─── Client → Server events ─────────────────────────────────────────────────
 *   join            { nodeId, displayName, protocolVersion }
 *   offer           { targetSocketId, sdp }
 *   answer          { targetSocketId, sdp }
 *   ice-candidate   { targetSocketId, candidate }
 *   leave           { nodeId?, reason? }
 *
 * Usage (e.g. in App.tsx):
 *   import { signalingClient } from './src/lib/signaling';
 *   signalingClient.onPeerList = (peers) => { ... };
 *   signalingClient.connect(SIGNALING_URL);
 *   signalingClient.join(nodeId, displayName);
 *
 * See: API_SPEC.md, TEAM_ASSIGNMENT.md → Developer 2
 */

import { io, Socket } from 'socket.io-client';
import { PROTOCOL_VERSION } from './constants';

// ─── Shared types (mirrors backend registry.types.ts NodeSummary) ─────────────

export interface NodeSummary {
  nodeId: string;
  socketId: string;
  displayName: string;
  connectedAt: number;
}

export interface ForwardedOfferPayload {
  fromSocketId: string;
  fromNodeId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface ForwardedAnswerPayload {
  fromSocketId: string;
  fromNodeId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface ForwardedIceCandidatePayload {
  fromSocketId: string;
  fromNodeId: string;
  candidate: RTCIceCandidateInit;
}

export interface PeerLeftPayload {
  nodeId: string;
  socketId: string;
  reason: 'graceful' | 'socket-disconnect';
}

export interface SignalingError {
  code: string;
  message: string;
  context?: unknown;
}

// ─── SignalingClient interface ─────────────────────────────────────────────────

export interface SignalingClient {
  /** Connect to the signaling server. Does not join until join() is called. */
  connect(url: string): void;
  /** Gracefully disconnect and emit 'leave'. */
  disconnect(): void;
  /** Emit 'join' — call after connect(). */
  join(nodeId: string, displayName: string): void;
  /** Forward an SDP offer to a specific peer. */
  sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void;
  /** Forward an SDP answer to a specific peer. */
  sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void;
  /** Forward an ICE candidate to a specific peer. */
  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void;
  /** Emit graceful leave to the server. */
  sendLeave(): void;
  /** Own socket ID — available after connect. */
  readonly socketId: string | null;
  /** True when the socket is connected. */
  readonly connected: boolean;

  // ── Callbacks — set by RTCManager (Dev 5) before calling connect() ──────────
  onPeerList: ((peers: NodeSummary[]) => void) | null;
  onNewPeer: ((peer: NodeSummary) => void) | null;
  onOffer: ((payload: ForwardedOfferPayload) => void) | null;
  onAnswer: ((payload: ForwardedAnswerPayload) => void) | null;
  onIceCandidate: ((payload: ForwardedIceCandidatePayload) => void) | null;
  onPeerLeft: ((payload: PeerLeftPayload) => void) | null;
  onError: ((error: SignalingError) => void) | null;
  onConnect: (() => void) | null;
  onDisconnect: ((reason: string) => void) | null;
}

// ─── Implementation ────────────────────────────────────────────────────────────

class SignalingClientImpl implements SignalingClient {
  private socket: Socket | null = null;
  private _nodeId: string | null = null;
  private _displayName: string | null = null;

  // Callbacks
  onPeerList: ((peers: NodeSummary[]) => void) | null = null;
  onNewPeer: ((peer: NodeSummary) => void) | null = null;
  onOffer: ((payload: ForwardedOfferPayload) => void) | null = null;
  onAnswer: ((payload: ForwardedAnswerPayload) => void) | null = null;
  onIceCandidate: ((payload: ForwardedIceCandidatePayload) => void) | null = null;
  onPeerLeft: ((payload: PeerLeftPayload) => void) | null = null;
  onError: ((error: SignalingError) => void) | null = null;
  onConnect: (() => void) | null = null;
  onDisconnect: ((reason: string) => void) | null = null;

  get socketId(): string | null {
    return this.socket?.id ?? null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(url: string): void {
    if (this.socket?.connected) {
      console.warn('[SignalingClient] Already connected — call disconnect() first');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    this._registerSocketEvents();
  }

  disconnect(): void {
    if (!this.socket) return;
    this.sendLeave();
    this.socket.disconnect();
    this.socket = null;
  }

  join(nodeId: string, displayName: string): void {
    this._nodeId = nodeId;
    this._displayName = displayName;
    this._emit('join', { nodeId, displayName, protocolVersion: PROTOCOL_VERSION });
  }

  sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    this._emit('offer', { targetSocketId, sdp });
  }

  sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    this._emit('answer', { targetSocketId, sdp });
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    this._emit('ice-candidate', { targetSocketId, candidate });
  }

  sendLeave(): void {
    if (!this.socket?.connected) return;
    this._emit('leave', { nodeId: this._nodeId ?? undefined, reason: 'user-initiated' });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _emit(event: string, payload: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[SignalingClient] Cannot emit '${event}' — not connected`);
      return;
    }
    this.socket.emit(event, payload);
  }

  private _registerSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`[SignalingClient] Connected — socket ${this.socket?.id}`);
      this.onConnect?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log(`[SignalingClient] Disconnected — ${reason}`);
      this.onDisconnect?.(reason);
    });

    this.socket.on('peer-list', (data: { peers: NodeSummary[] }) => {
      this.onPeerList?.(data.peers);
    });

    this.socket.on('new-peer', (data: { peer: NodeSummary }) => {
      this.onNewPeer?.(data.peer);
    });

    this.socket.on('peer-left', (data: PeerLeftPayload) => {
      this.onPeerLeft?.(data);
    });

    this.socket.on('offer', (data: ForwardedOfferPayload) => {
      this.onOffer?.(data);
    });

    this.socket.on('answer', (data: ForwardedAnswerPayload) => {
      this.onAnswer?.(data);
    });

    this.socket.on('ice-candidate', (data: ForwardedIceCandidatePayload) => {
      this.onIceCandidate?.(data);
    });

    this.socket.on('signaling-error', (error: SignalingError) => {
      console.error(`[SignalingClient] Server error: ${error.code} — ${error.message}`);
      this.onError?.(error);
    });
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

/**
 * Shared singleton — import this everywhere.
 * Dev 5 (RTCManager) sets callbacks before connect() is called.
 *
 * Example bootstrap (App.tsx):
 *
 *   import { signalingClient } from './src/lib/signaling';
 *   import { getOrCreateNodeId, getOrCreateDisplayName } from './src/lib/nodeId';
 *   import { SIGNALING_URL } from './src/lib/constants';
 *
 *   const nodeId = await getOrCreateNodeId();
 *   const displayName = await getOrCreateDisplayName();
 *
 *   signalingClient.onPeerList = (peers) => console.log('peers:', peers);
 *   signalingClient.onNewPeer  = (peer)  => console.log('new peer:', peer);
 *   signalingClient.onPeerLeft = (p)     => console.log('left:', p.nodeId);
 *
 *   signalingClient.connect(SIGNALING_URL);
 *   signalingClient.join(nodeId, displayName);
 */
export const signalingClient: SignalingClient = new SignalingClientImpl();
