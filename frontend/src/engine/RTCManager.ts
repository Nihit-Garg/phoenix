/**
 * frontend/src/engine/RTCManager.ts
 *
 * Manages all WebRTC peer connections and DataChannels.
 *
 * For each peer discovered via the signaling server:
 *  1. Creates an RTCPeerConnection
 *  2. Negotiates SDP offer/answer via SignalingClient (Dev 2)
 *  3. Exchanges ICE candidates
 *  4. Opens a DataChannel labelled 'mirage'
 *  5. Delivers raw DataChannel messages to MeshEngine via onMessage callback
 *
 * DataChannel config: ordered=false, maxRetransmits=0 (UDP-like, low latency)
 *
 * See: ARCHITECTURE.md § 4. WebRTC Signaling Flow
 */

import {
  SignalingClient,
  NodeSummary,
  ForwardedOfferPayload,
  ForwardedAnswerPayload,
  ForwardedIceCandidatePayload,
} from '../lib/signaling';
import { Platform } from 'react-native';

const DC_LABEL = 'mirage';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type OnMessageFn = (fromNodeId: string, raw: string) => void;
type OnOpenFn    = (peer: NodeSummary) => void;
type OnCloseFn   = (nodeId: string) => void;

interface PeerConnection {
  pc:        RTCPeerConnection;
  dc:        RTCDataChannel | null;
  nodeId:    string;
  socketId:  string;
}

export class RTCManager {
  private peers       = new Map<string, PeerConnection>(); // keyed by nodeId
  private sigClient:  SignalingClient | null = null;
  private localNodeId = '';

  private onMessage: OnMessageFn = () => {};
  private onOpen:    OnOpenFn    = () => {};
  private onClose:   OnCloseFn   = () => {};

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  init(opts: {
    sigClient:    SignalingClient;
    localNodeId:  string;
    onMessage:    OnMessageFn;
    onOpen:       OnOpenFn;
    onClose:      OnCloseFn;
  }): void {
    this.sigClient   = opts.sigClient;
    this.localNodeId = opts.localNodeId;
    this.onMessage   = opts.onMessage;
    this.onOpen      = opts.onOpen;
    this.onClose     = opts.onClose;

    this._bindSignalingCallbacks();
  }

  isSupported(): boolean {
    if (Platform.OS === 'web') return typeof globalThis.RTCPeerConnection !== 'undefined';
    try {
      return typeof require('react-native-webrtc').RTCPeerConnection !== 'undefined';
    } catch {
      return false;
    }
  }

  destroy(): void {
    for (const conn of this.peers.values()) conn.pc.close();
    this.peers.clear();
  }

  // ─── Initiating a connection ─────────────────────────────────────────────────

  /** Called when we receive a peer-list entry or new-peer event. We are the initiator. */
  async connectToPeer(peer: NodeSummary): Promise<void> {
    if (this.peers.has(peer.nodeId)) return; // already connected

    const conn = this._createPeerConnection(peer.nodeId, peer.socketId);

    // Initiator creates DataChannel
    const dc = conn.pc.createDataChannel(DC_LABEL, { ordered: false, maxRetransmits: 0 });
    conn.dc = dc;
    this._bindDataChannel(dc, peer.nodeId, peer);

    // Create and send offer
    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);
    this.sigClient!.sendOffer(peer.socketId, offer);
  }

  // ─── Sending ─────────────────────────────────────────────────────────────────

  send(destNodeId: string, data: string): boolean {
    const conn = this.peers.get(destNodeId);
    if (!conn?.dc || conn.dc.readyState !== 'open') return false;
    conn.dc.send(data);
    return true;
  }

  /** Broadcast to all open DataChannels, optionally excluding the link it arrived on. */
  broadcast(data: string, excludedNodeId?: string): void {
    for (const conn of this.peers.values()) {
      if (conn.nodeId === excludedNodeId) continue;
      if (conn.dc?.readyState === 'open') conn.dc.send(data);
    }
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, c]) => c.dc?.readyState === 'open')
      .map(([nodeId]) => nodeId);
  }

  // ─── Private — signaling callbacks ───────────────────────────────────────────

  private _bindSignalingCallbacks(): void {
    const sig = this.sigClient!;

    // When we get an offer, we are the responder
    sig.onOffer = async (payload: ForwardedOfferPayload) => {
      const existing = this.peers.get(payload.fromNodeId);
      if (existing) {
        // The server design elects existing peers as initiators. Ignore a late or
        // duplicate offer rather than replacing a live peer connection.
        if (existing.pc.signalingState !== 'closed') return;
        this._closePeer(payload.fromNodeId);
      }
      const conn = this._createPeerConnection(payload.fromNodeId, payload.fromSocketId);

      // Responder waits for DataChannel
      conn.pc.ondatachannel = (event) => {
        conn.dc = event.channel;
        this._bindDataChannel(event.channel, payload.fromNodeId, {
          nodeId:      payload.fromNodeId,
          socketId:    payload.fromSocketId,
          displayName: payload.fromNodeId,
          connectedAt: Date.now(),
        });
      };

      await conn.pc.setRemoteDescription(payload.sdp);
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      sig.sendAnswer(payload.fromSocketId, answer);
    };

    sig.onAnswer = async (payload: ForwardedAnswerPayload) => {
      const conn = this.peers.get(payload.fromNodeId);
      if (!conn) return;
      await conn.pc.setRemoteDescription(payload.sdp);
    };

    sig.onIceCandidate = async (payload: ForwardedIceCandidatePayload) => {
      const conn = this.peers.get(payload.fromNodeId);
      if (!conn) return;
      try {
        await conn.pc.addIceCandidate(payload.candidate);
      } catch (error) {
        // A candidate received before SDP is recoverable only if negotiation is
        // retried. Surface it rather than silently hiding a connectivity failure.
        console.warn('[RTCManager] Could not add ICE candidate', error);
      }
    };

    sig.onPeerLeft = (payload) => {
      this._closePeer(payload.nodeId);
    };
  }

  // ─── Private — helpers ────────────────────────────────────────────────────────

  private _createPeerConnection(nodeId: string, socketId: string): PeerConnection {
    const PeerConnection = this._getPeerConnectionConstructor();
    const pc = new PeerConnection(RTC_CONFIG) as RTCPeerConnection;

    const conn: PeerConnection = { pc, dc: null, nodeId, socketId };
    this.peers.set(nodeId, conn);

    // Trickle ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sigClient!.sendIceCandidate(socketId, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this._closePeer(nodeId);
      }
    };

    return conn;
  }

  private _getPeerConnectionConstructor(): typeof RTCPeerConnection {
    if (Platform.OS === 'web') {
      if (!globalThis.RTCPeerConnection) {
        throw new Error('WebRTC is unavailable in this browser.');
      }
      return globalThis.RTCPeerConnection;
    }

    try {
      return require('react-native-webrtc').RTCPeerConnection as typeof RTCPeerConnection;
    } catch {
      throw new Error(
        'Native WebRTC is unavailable. Install react-native-webrtc and run a custom Expo development build.'
      );
    }
  }

  private _bindDataChannel(dc: RTCDataChannel, nodeId: string, peer: NodeSummary): void {
    dc.onopen = () => {
      console.log(`[RTCManager] DataChannel open → ${nodeId}`);
      this.onOpen(peer);
    };

    dc.onclose = () => {
      console.log(`[RTCManager] DataChannel closed → ${nodeId}`);
      this._closePeer(nodeId);
    };

    dc.onmessage = (event) => {
      this.onMessage(nodeId, event.data as string);
    };
  }

  private _closePeer(nodeId: string): void {
    const conn = this.peers.get(nodeId);
    if (!conn) return;
    conn.dc?.close();
    conn.pc.close();
    this.peers.delete(nodeId);
    this.onClose(nodeId);
  }
}
