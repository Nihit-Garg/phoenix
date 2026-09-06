/**
 * signaling/handlers/onDisconnect.ts — handles Socket.IO 'disconnect' event
 *
 * Triggered when: a socket disconnects for ANY reason — graceful leave,
 * browser crash, network drop, or timeout. This is the safety net.
 *
 * This handler MUST be idempotent — if onLeave already ran and cleaned up
 * the registry, this handler will find nothing and exit cleanly.
 *
 * Flow:
 *   1. Check if socket is still in the registry
 *   2. If NOT in registry: leave already handled it → skip
 *   3. If IN registry: remove it and broadcast 'peer-left' with reason 'socket-disconnect'
 *   4. Log the disconnection with Socket.IO-provided reason string
 *
 * See: API_SPEC.md → peer-left event
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { logger } from '../../utils/logger';

export function onDisconnect(socket: Socket, io: Server) {
  return (reason: string): void => {
    // Step 1 — Check if socket is still in registry
    const entry = registry.get(socket.id);

    if (!entry) {
      // Step 2 — Already cleaned up by onLeave — nothing to do
      logger.debug('onDisconnect', 'Socket already removed from registry (onLeave ran first)', {
        socketId: socket.id,
        reason,
      });
      return;
    }

    // Step 3 — Remove from registry
    registry.remove(socket.id);

    // Broadcast 'peer-left' with 'socket-disconnect' reason to all remaining peers
    // Note: socket.broadcast won't work after disconnect — use io.emit and exclude manually
    // Since the socket is disconnected, socket.broadcast IS safe here per Socket.IO docs
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'socket-disconnect' as const,
    });

    // Step 4 — Log
    logger.info(
      'onDisconnect',
      `Node disconnected (${reason}): ${entry.nodeId} (${entry.displayName})`,
      {
        socketId: socket.id,
        socketIoReason: reason,
        remainingPeers: registry.size(),
      }
    );
  };
}
