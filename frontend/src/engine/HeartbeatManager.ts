/**
 * frontend/src/engine/HeartbeatManager.ts
 *
 * Manages liveness probing for all direct neighbours.
 *
 * Every 3 seconds, sends a HEARTBEAT to each known neighbour.
 * If 3 consecutive heartbeats go unacknowledged, the peer is declared dead.
 *
 * See: ARCHITECTURE.md § 8. Node Failure & Rerouting Workflow
 *
 * Parameters (from spec):
 *   Interval:       3 000 ms
 *   Dead threshold: 3 missed beats (= 9 s)
 */

import { MirageNode } from './types';

const HEARTBEAT_INTERVAL_MS = 3_000;
const DEAD_THRESHOLD        = 3;

interface PeerState {
  nodeId:        string;
  sequence:      number;   // last sent sequence
  missedBeats:   number;
  status:        MirageNode['status'];
}

type SendHeartbeatFn = (destId: string, sequence: number, queueDepth: number) => void;
type OnDeadFn        = (nodeId: string) => void;
type OnSuspectFn     = (nodeId: string) => void;
type GetQueueDepthFn = () => number;

export class HeartbeatManager {
  private peers   = new Map<string, PeerState>();
  private timer:  ReturnType<typeof setInterval> | null = null;

  private sendHeartbeat:  SendHeartbeatFn  = () => {};
  private onDead:         OnDeadFn         = () => {};
  private onSuspect:      OnSuspectFn      = () => {};
  private getQueueDepth:  GetQueueDepthFn  = () => 0;

  init(opts: {
    sendHeartbeat:  SendHeartbeatFn;
    onDead:         OnDeadFn;
    onSuspect:      OnSuspectFn;
    getQueueDepth:  GetQueueDepthFn;
  }): void {
    this.sendHeartbeat = opts.sendHeartbeat;
    this.onDead        = opts.onDead;
    this.onSuspect     = opts.onSuspect;
    this.getQueueDepth = opts.getQueueDepth;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  addPeer(nodeId: string): void {
    if (!this.peers.has(nodeId)) {
      this.peers.set(nodeId, { nodeId, sequence: 0, missedBeats: 0, status: 'alive' });
    }
  }

  removePeer(nodeId: string): void {
    this.peers.delete(nodeId);
  }

  /** Called when a HEARTBEAT_ACK arrives from a peer. Resets missed count. */
  ackReceived(fromNodeId: string, _echoSequence: number): void {
    const state = this.peers.get(fromNodeId);
    if (!state) return;
    state.missedBeats = 0;
    state.status      = 'alive';
  }

  clear(): void {
    this.stop();
    this.peers.clear();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _tick(): void {
    const depth = this.getQueueDepth();

    for (const state of this.peers.values()) {
      state.sequence += 1;
      state.missedBeats += 1; // assume missed until ACK resets it

      this.sendHeartbeat(state.nodeId, state.sequence, depth);

      if (state.missedBeats >= DEAD_THRESHOLD && state.status !== 'dead') {
        state.status = 'dead';
        this.onDead(state.nodeId);
      } else if (state.missedBeats >= 1 && state.missedBeats < DEAD_THRESHOLD && state.status === 'alive') {
        state.status = 'suspect';
        this.onSuspect(state.nodeId);
      }
    }
  }
}
