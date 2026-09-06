/**
 * signaling/handlers/onJoin.ts — handles the 'join' event
 *
 * Triggered when: a client emits socket.emit('join', JoinPayload)
 *
 * 1. Validates payload via Zod schema.
 * 2. If invalid: emits 'signaling-error' with code 'INVALID_PAYLOAD'.
 * 3. If valid:
 *    a. Upserts the client into the registry.
 *    b. Emits 'peer-list' to the joining socket with all OTHER connected nodes.
 *    c. Broadcasts 'new-peer' to all OTHER sockets.
 * 4. Logs the join event.
 *
 * See: API_SPEC.md → join event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { joinSchema, emitSignalingError } from '../validation';
import { logger } from '../../utils/logger';

export function onJoin(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    const result = joinSchema.safeParse(payload);

    if (!result.success) {
      emitSignalingError(socket, 'INVALID_PAYLOAD', 'Invalid join payload', {
        errors: result.error.flatten(),
      });
      logger.warn('onJoin', `Invalid join payload from socket ${socket.id}`, {
        errors: result.error.flatten(),
      });
      return;
    }

    const { nodeId, displayName, protocolVersion } = result.data;
    const now = Date.now();

    // Upsert into registry — handles re-connects gracefully
    registry.upsert(socket.id, {
      nodeId,
      socketId: socket.id,
      displayName,
      protocolVersion,
      connectedAt: now,
      lastActivityAt: now,
    });

    // Build peer-list for the joining client (excludes self)
    const peers = registry.getAllExcept(socket.id).map(registry.toNodeSummary);

    // Emit peer-list to the joining socket only
    socket.emit('peer-list', { peers });

    // Broadcast new-peer to all OTHER currently connected sockets
    socket.broadcast.emit('new-peer', {
      peer: registry.toNodeSummary(registry.get(socket.id)!),
    });

    logger.info('onJoin', `Node ${nodeId} (${displayName}) joined`, {
      socketId: socket.id,
      protocolVersion,
      peerCount: registry.size(),
    });
  };
}
