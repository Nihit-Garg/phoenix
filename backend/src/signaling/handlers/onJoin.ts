/**
 * signaling/handlers/onJoin.ts — handles the 'join' Socket.IO event
 *
 * Triggered when: a client emits socket.emit('join', JoinPayload)
 *
 * Flow:
 *   1. Validate payload via joinSchema
 *   2. If invalid: emit 'signaling-error' INVALID_PAYLOAD back to sender
 *   3. If valid:
 *      a. Upsert client into the registry
 *      b. Emit 'peer-list' to the joining socket (all OTHER connected peers)
 *      c. Broadcast 'new-peer' to all OTHER sockets
 *   4. Log the join
 *
 * See: API_SPEC.md → join event
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { joinSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onJoin(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Step 1 — Validate payload
    const result = joinSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('onJoin', 'Invalid join payload', {
        socketId: socket.id,
        errors: result.error.flatten(),
      });
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'join payload failed validation',
        context: { errors: result.error.flatten() },
      });
      return;
    }

    const { nodeId, displayName, protocolVersion } = result.data;
    const now = Date.now();

    // Step 3a — Upsert into registry
    registry.upsert(socket.id, {
      nodeId,
      socketId: socket.id,
      displayName,
      protocolVersion,
      connectedAt: now,
      lastActivityAt: now,
    });

    // Step 3b — Emit 'peer-list' to the joining socket (all OTHERS)
    const otherPeers = registry
      .getAllExcept(socket.id)
      .map(registry.toNodeSummary);

    socket.emit('peer-list', { peers: otherPeers });

    // Step 3c — Broadcast 'new-peer' to ALL other connected sockets
    const newPeerSummary = registry.toNodeSummary(
      registry.get(socket.id)!
    );
    socket.broadcast.emit('new-peer', { peer: newPeerSummary });

    // Step 4 — Log
    logger.info('onJoin', `Node joined: ${nodeId} (${displayName})`, {
      socketId: socket.id,
      protocolVersion,
      totalPeers: registry.size(),
    });
  };
}
