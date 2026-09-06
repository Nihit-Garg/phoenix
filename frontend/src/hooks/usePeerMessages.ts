/**
 * src/hooks/usePeerMessages.ts
 *
 * Returns the message thread between the local node and a specific peer.
 * Also returns a sendMessage action that fires through MeshEngine.
 */

import { useCallback } from 'react';
import { usePacketStore } from '../stores/usePacketStore';
import { useMeshStore } from '../stores/useMeshStore';
import { useMeshEngine } from './useMeshEngine';
import { PacketPriority } from '../engine/types';

export function usePeerMessages(peerId: string) {
  const { getMessagesForPeer } = usePacketStore();
  const { localNodeId } = useMeshStore();
  const { sendPacket } = useMeshEngine();

  const messages = getMessagesForPeer(peerId, localNodeId);

  const send = useCallback(
    (text: string, priority: PacketPriority = 'NORMAL') => {
      sendPacket(peerId, text, priority);
    },
    [peerId, sendPacket]
  );

  return { messages, send };
}
