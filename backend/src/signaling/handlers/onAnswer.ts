/**
 * signaling/handlers/onAnswer.ts — handles the 'answer' event
 *
 * Triggered when: the responding peer emits 'answer' with an SDP answer.
 *
 * 1. Validates payload (Zod: AnswerPayload).
 * 2. Checks that targetSocketId is connected.
 * 3. If not found: emits 'signaling-error' with code 'TARGET_NOT_FOUND'.
 * 4. Forwards the SDP answer to targetSocketId with sender metadata.
 *
 * See: API_SPEC.md → answer event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { answerSchema, emitSignalingError } from '../validation';
import { logger } from '../../utils/logger';

export function onAnswer(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    registry.updateActivity(socket.id);

    const result = answerSchema.safeParse(payload);

    if (!result.success) {
      emitSignalingError(socket, 'INVALID_PAYLOAD', 'Invalid answer payload', {
        errors: result.error.flatten(),
      });
      logger.warn('onAnswer', `Invalid answer payload from socket ${socket.id}`);
      return;
    }

    const { targetSocketId, sdp } = result.data;

    // Check target exists
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      emitSignalingError(socket, 'TARGET_NOT_FOUND', `Target socket ${targetSocketId} not found`);
      logger.warn('onAnswer', `Target socket not found: ${targetSocketId}`, {
        fromSocketId: socket.id,
      });
      return;
    }

    const senderEntry = registry.get(socket.id);
    const fromNodeId = senderEntry?.nodeId ?? 'unknown';

    // Forward the answer with sender metadata
    targetSocket.emit('answer', {
      fromSocketId: socket.id,
      fromNodeId,
      sdp,
    });

    logger.debug('onAnswer', `Forwarded answer from ${fromNodeId} to ${targetSocketId}`);
  };
}
