/**
 * signaling/handlers/onDisconnect.ts — handles Socket.IO 'disconnect' event
 *
 * Triggered when: a socket disconnects for ANY reason — graceful leave,
 * browser crash, network drop, or timeout. This is the safety net.
 *
 * 1. Checks if the socket still exists in the registry.
 *    (If 'leave' was already processed, it will have been removed — skip.)
 * 2. If still in registry: removes it.
 * 3. Broadcasts 'peer-left' to all remaining sockets with reason 'socket-disconnect'.
 * 4. Logs the disconnection with reason.
 *
 * This handler MUST be idempotent — it may be called after onLeave has
 * already cleaned up.
 *
 * See: API_SPEC.md → peer-left event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { logger } from '../../utils/logger';

export function onDisconnect(socket: Socket, io: Server) {
  return (reason: string): void => {
    // Idempotent check: if already cleaned up by onLeave, entry will be undefined
    const entry = registry.remove(socket.id);

    if (!entry) {
      // Already removed by onLeave — nothing to do
      logger.debug('onDisconnect', `Socket ${socket.id} already cleaned up; skipping`, { reason });
      return;
    }

    // Broadcast peer-left to all remaining connected sockets
    // Note: socket.broadcast includes everyone except the disconnected socket
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'socket-disconnect',
    });

    logger.info(
      'onDisconnect',
      `Node ${entry.nodeId} (${entry.displayName}) disconnected unexpectedly`,
      {
        socketId: socket.id,
        socketIOReason: reason,
        remainingPeers: registry.size(),
      },
    );
  };
}
