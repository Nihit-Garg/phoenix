/**
 * signaling/handlers/onLeave.ts — handles the 'leave' event (graceful disconnect)
 *
 * Triggered when: a client emits 'leave' before closing the tab/window.
 *
 * 1. Validates payload (optional; may be empty or { nodeId, reason }).
 * 2. Removes the socket from the registry.
 * 3. Broadcasts 'peer-left' to all OTHER connected sockets with reason 'graceful'.
 * 4. Logs the departure.
 *
 * Note: onDisconnect.ts handles the case where 'leave' is NOT sent (crash/timeout).
 * Both paths emit 'peer-left' with the appropriate reason.
 *
 * See: API_SPEC.md → leave event and peer-left event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { leaveSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onLeave(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Payload is optional — parse gracefully
    const result = leaveSchema.safeParse(payload ?? {});
    const reason = result.success ? (result.data.reason ?? 'user_closed_tab') : 'user_closed_tab';

    const entry = registry.remove(socket.id);

    if (!entry) {
      // Already removed (e.g., duplicate leave event), nothing to do
      logger.debug('onLeave', `Socket ${socket.id} not in registry; skipping`);
      return;
    }

    // Broadcast peer-left to all remaining sockets
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'graceful',
    });

    logger.info('onLeave', `Node ${entry.nodeId} (${entry.displayName}) left gracefully`, {
      socketId: socket.id,
      reason,
      remainingPeers: registry.size(),
    });
  };
}
