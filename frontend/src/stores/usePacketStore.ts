/**
 * src/stores/usePacketStore.ts
 *
 * Zustand store for all packet-level state.
 * Subscribed to MeshEngine events by useMeshEngine hook.
 *
 * Tracks:
 *   - deliveredMessages: messages received/sent, grouped by peer
 *   - scfQueue: packets currently waiting in store-carry-forward queue
 *   - traceLog: recent packet hop traces (for debug/demo)
 */

import { create } from 'zustand';
import { MiragePacket, QueueEntry } from '../engine/types';

export interface UIMessage {
  id: string;
  packetId: string;
  senderId: string;
  senderName: string;
  destId: string;
  content: string;
  timestamp: number;
  hops: number;
  priority: string;
  status: 'sending' | 'sent' | 'delivered' | 'queued';
  isSelf: boolean;
}

export interface PacketTraceEntry {
  packetId: string;
  type: string;
  originId: string;
  destId: string;
  hopTrace: string[];
  timestamp: number;
  status: 'forwarded' | 'delivered' | 'queued';
}

interface PacketState {
  // All messages received (keyed by peer)
  deliveredMessages: UIMessage[];

  // Active SCF queue entries
  scfQueue: QueueEntry[];

  // Trace log (last 50 packets)
  traceLog: PacketTraceEntry[];

  // Actions
  addDeliveredMessage: (msg: UIMessage) => void;
  addOutgoingMessage: (msg: UIMessage) => void;
  enqueuePacket: (entry: QueueEntry) => void;
  dequeuePacket: (packetId: string) => void;
  addTraceEntry: (entry: PacketTraceEntry) => void;
  getMessagesForPeer: (peerId: string, selfId: string) => UIMessage[];
}

export const usePacketStore = create<PacketState>((set, get) => ({
  deliveredMessages: [],
  scfQueue: [],
  traceLog: [],

  addDeliveredMessage: (msg) =>
    set((state) => ({
      deliveredMessages: [...state.deliveredMessages, msg],
    })),

  addOutgoingMessage: (msg) =>
    set((state) => ({
      deliveredMessages: [...state.deliveredMessages, msg],
    })),

  enqueuePacket: (entry) =>
    set((state) => ({
      scfQueue: [...state.scfQueue, entry],
    })),

  dequeuePacket: (packetId) =>
    set((state) => ({
      scfQueue: state.scfQueue.filter((e) => e.id !== packetId),
    })),

  addTraceEntry: (entry) =>
    set((state) => ({
      traceLog: [entry, ...state.traceLog].slice(0, 50),
    })),

  getMessagesForPeer: (peerId, selfId) => {
    const all = get().deliveredMessages;
    return all.filter(
      (m) =>
        (m.senderId === peerId && m.destId === selfId) ||
        (m.senderId === selfId && m.destId === peerId) ||
        m.destId === '*'
    );
  },
}));
