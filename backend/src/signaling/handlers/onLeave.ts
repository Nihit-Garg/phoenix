/**
 * signaling/handlers/onLeave.ts — handles the 'leave' event (graceful disconnect)
 *
 * Triggered when: a client emits 'leave' before closing the tab/window.
 * This is the "happy path" disconnection — the client is well-behaved.
 *
 * Flow:
 *   1. Validate payload (lenient — fields are optional)
 *   2. Remove socket from registry
 *   3. Broadcast 'peer-left' to ALL other connected sockets with reason 'graceful'
 *   4. Log the departure
 *
 * Note: onDisconnect.ts is the safety net for crash/timeout scenarios.
 * Both paths MUST emit 'peer-left' with the appropriate reason string.
 *
 * See: API_SPEC.md → leave event and peer-left event
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { leaveSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onLeave(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Step 1 — Validate payload (optional fields, best-effort)
    const result = leaveSchema.safeParse(payload ?? {});
    // Even if validation fails, proceed with cleanup — leave is best-effort
    const reason = result.success ? (result.data.reason ?? 'user_closed') : 'unknown';

    // Step 2 — Remove from registry
    const entry = registry.remove(socket.id);

    if (!entry) {
      // Already removed (e.g., duplicate leave event) — nothing to do
      logger.debug('onLeave', 'Socket not in registry (already cleaned up)', {
        socketId: socket.id,
      });
      return;
    }

    // Step 3 — Broadcast 'peer-left' to all OTHER sockets
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'graceful' as const,
    });

    // Step 4 — Log
    logger.info('onLeave', `Node left gracefully: ${entry.nodeId} (${entry.displayName})`, {
      socketId: socket.id,
      reason,
      remainingPeers: registry.size(),
    });
  };
}
