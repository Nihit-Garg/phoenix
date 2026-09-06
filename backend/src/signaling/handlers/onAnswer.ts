/**
 * signaling/handlers/onAnswer.ts — handles the 'answer' Socket.IO event
 *
 * Triggered when: the responding peer emits 'answer' with an SDP answer.
 * This completes the SDP offer/answer exchange for WebRTC negotiation.
 *
 * Flow:
 *   1. Validate payload via answerSchema
 *   2. If invalid: emit 'signaling-error' INVALID_PAYLOAD to sender
 *   3. Look up targetSocketId in the registry
 *   4. If not found: emit 'signaling-error' TARGET_NOT_FOUND to sender
 *   5. Forward the SDP answer to targetSocketId with sender metadata
 *
 * See: API_SPEC.md → answer event
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { answerSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onAnswer(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Step 1 — Validate payload
    const result = answerSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('onAnswer', 'Invalid answer payload', {
        socketId: socket.id,
        errors: result.error.flatten(),
      });
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'answer payload failed validation',
        context: { errors: result.error.flatten() },
      });
      return;
    }

    const { targetSocketId, sdp } = result.data;

    // Step 3 — Look up target in registry
    const targetEntry = registry.get(targetSocketId);
    if (!targetEntry) {
      logger.warn('onAnswer', 'Target socket not found', {
        fromSocketId: socket.id,
        targetSocketId,
      });
      socket.emit('signaling-error', {
        code: 'TARGET_NOT_FOUND',
        message: `Target socket ${targetSocketId} is not connected`,
        context: { targetSocketId },
      });
      return;
    }

    // Step 5 — Forward to target with sender metadata
    const senderEntry = registry.get(socket.id);
    const fromNodeId = senderEntry?.nodeId ?? '';

    io.to(targetSocketId).emit('answer', {
      fromSocketId: socket.id,
      fromNodeId,
      sdp,
    });

    logger.debug('onAnswer', `Forwarded SDP answer`, {
      from: socket.id,
      to: targetSocketId,
    });
  };
}
