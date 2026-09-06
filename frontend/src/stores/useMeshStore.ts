/**
 * src/stores/useMeshStore.ts
 *
 * Zustand store for real-time mesh state.
 * Subscribed to MeshEngine events by useMeshEngine hook.
 *
 * Tracks:
 *   - localNodeId / displayName (self)
 *   - peers Map (all connected nodes)
 *   - routingTable (current Bellman-Ford snapshot)
 *   - connectionStatus (signaling server link)
 */

import { create } from 'zustand';
import { MirageNode, RoutingEntry } from '../engine/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface MeshState {
  // Local identity
  localNodeId: string;
  displayName: string;

  // Peer map — keyed by nodeId
  peers: Map<string, MirageNode>;

  // Bellman-Ford routing table snapshot
  routingTable: RoutingEntry[];

  // Signaling server connection status
  connectionStatus: ConnectionStatus;

  // Actions
  setLocalIdentity: (nodeId: string, displayName: string) => void;
  addOrUpdatePeer: (node: MirageNode) => void;
  removePeer: (nodeId: string) => void;
  setRoutingTable: (table: RoutingEntry[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  getPeerCount: () => number;
  getPeer: (nodeId: string) => MirageNode | undefined;
}

export const useMeshStore = create<MeshState>((set, get) => ({
  localNodeId: '',
  displayName: '',
  peers: new Map(),
  routingTable: [],
  connectionStatus: 'disconnected',

  setLocalIdentity: (nodeId, displayName) =>
    set({ localNodeId: nodeId, displayName }),

  addOrUpdatePeer: (node) =>
    set((state) => {
      const updated = new Map(state.peers);
      updated.set(node.nodeId, node);
      return { peers: updated };
    }),

  removePeer: (nodeId) =>
    set((state) => {
      const updated = new Map(state.peers);
      updated.delete(nodeId);
      return { peers: updated };
    }),

  setRoutingTable: (table) => set({ routingTable: table }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  getPeerCount: () => get().peers.size,

  getPeer: (nodeId) => get().peers.get(nodeId),
}));
