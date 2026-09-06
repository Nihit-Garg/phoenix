/**
 * signaling/handlers/onIceCandidate.ts — handles the 'ice-candidate' event
 *
 * Triggered when: either peer emits 'ice-candidate' as trickle ICE fires locally.
 *
 * 1. Validates payload (Zod: IceCandidatePayload).
 * 2. Silently drops if targetSocketId is not connected (ICE candidates can be lost).
 * 3. Forwards the ICE candidate to targetSocketId with sender metadata.
 *
 * Note: Unlike offer/answer, a missing target is silently dropped (not an error).
 *
 * See: API_SPEC.md → ice-candidate event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { iceCandidateSchema, emitSignalingError } from '../validation';
import { logger } from '../../utils/logger';

export function onIceCandidate(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    registry.updateActivity(socket.id);

    const result = iceCandidateSchema.safeParse(payload);

    if (!result.success) {
      emitSignalingError(socket, 'INVALID_PAYLOAD', 'Invalid ice-candidate payload', {
        errors: result.error.flatten(),
      });
      logger.warn('onIceCandidate', `Invalid ice-candidate payload from socket ${socket.id}`);
      return;
    }

    const { targetSocketId, candidate } = result.data;

    // Silently drop if target is not connected — ICE is tolerant of lost candidates
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      logger.debug('onIceCandidate', `Target not found, silently dropping: ${targetSocketId}`);
      return;
    }

    const senderEntry = registry.get(socket.id);
    const fromNodeId = senderEntry?.nodeId ?? 'unknown';

    // Forward the ICE candidate with sender metadata
    targetSocket.emit('ice-candidate', {
      fromSocketId: socket.id,
      fromNodeId,
      candidate,
    });

    logger.debug('onIceCandidate', `Forwarded ICE candidate from ${fromNodeId} to ${targetSocketId}`);
  };
}
