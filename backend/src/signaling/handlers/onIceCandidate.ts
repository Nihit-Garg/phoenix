/**
 * signaling/handlers/onIceCandidate.ts — handles the 'ice-candidate' Socket.IO event
 *
 * Triggered when: either peer emits 'ice-candidate' as trickle ICE fires locally.
 * Unlike offer/answer, a missing target is SILENTLY DROPPED — ICE candidates
 * are tolerant of loss and re-sending is not needed.
 *
 * Flow:
 *   1. Validate payload via iceCandidateSchema
 *   2. If invalid: emit 'signaling-error' INVALID_PAYLOAD to sender
 *   3. Look up targetSocketId in registry
 *   4. If not found: silently drop (no error emitted)
 *   5. Forward ICE candidate to targetSocketId with sender metadata
 *
 * See: API_SPEC.md → ice-candidate event
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { iceCandidateSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onIceCandidate(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Step 1 — Validate payload
    const result = iceCandidateSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('onIceCandidate', 'Invalid ice-candidate payload', {
        socketId: socket.id,
        errors: result.error.flatten(),
      });
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'ice-candidate payload failed validation',
        context: { errors: result.error.flatten() },
      });
      return;
    }

    const { targetSocketId, candidate } = result.data;

    // Step 3 — Look up target; silently drop if not found (Step 4)
    const targetEntry = registry.get(targetSocketId);
    if (!targetEntry) {
      // Intentionally not logging at warn — this is expected when the peer
      // has just disconnected during ICE negotiation.
      logger.debug('onIceCandidate', 'Target not found — dropping candidate silently', {
        fromSocketId: socket.id,
        targetSocketId,
      });
      return;
    }

    // Step 5 — Forward to target with sender metadata
    const senderEntry = registry.get(socket.id);
    const fromNodeId = senderEntry?.nodeId ?? '';

    io.to(targetSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      fromNodeId,
      candidate,
    });

    logger.debug('onIceCandidate', `Forwarded ICE candidate`, {
      from: socket.id,
      to: targetSocketId,
    });
  };
}
