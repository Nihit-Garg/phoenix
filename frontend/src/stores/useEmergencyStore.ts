/**
 * src/stores/useEmergencyStore.ts
 *
 * Zustand store for emergency events.
 * Updated by useMeshEngine hook when 'emergency' events fire.
 */

import { create } from 'zustand';
import { EmergencyMarker } from '../engine/types';

interface EmergencyState {
  activeEmergencies: EmergencyMarker[];
  acknowledged: Set<string>; // packetIds acknowledged by the user

  addEmergency: (marker: EmergencyMarker) => void;
  acknowledge: (packetId: string) => void;
  getUnacknowledged: () => EmergencyMarker[];
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  activeEmergencies: [],
  acknowledged: new Set(),

  addEmergency: (marker) =>
    set((state) => ({
      activeEmergencies: [marker, ...state.activeEmergencies].slice(0, 20),
    })),

  acknowledge: (packetId) =>
    set((state) => {
      const ack = new Set(state.acknowledged);
      ack.add(packetId);
      return { acknowledged: ack };
    }),

  getUnacknowledged: () => {
    const { activeEmergencies, acknowledged } = get();
    return activeEmergencies.filter((e) => !acknowledged.has(e.packetId));
  },
}));
