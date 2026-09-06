/**
 * src/hooks/useEmergency.ts
 *
 * Convenience hook for emergency state.
 * Returns unacknowledged emergencies and an acknowledge action.
 */

import { useEmergencyStore } from '../stores/useEmergencyStore';
import { useMeshEngine } from './useMeshEngine';
import { useCallback } from 'react';

export function useEmergency() {
  const { activeEmergencies, acknowledged, acknowledge } = useEmergencyStore();
  const { sendEmergency } = useMeshEngine();

  const unacknowledged = activeEmergencies.filter((e) => !acknowledged.has(e.packetId));

  const broadcastEmergency = useCallback(
    (text: string) => {
      sendEmergency(text, 'HIGH');
    },
    [sendEmergency]
  );

  return {
    activeEmergencies,
    unacknowledged,
    acknowledge,
    broadcastEmergency,
    hasActiveEmergency: unacknowledged.length > 0,
  };
}
