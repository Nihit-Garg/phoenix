/**
 * signaling/handlers/onOffer.ts — handles the 'offer' Socket.IO event
 *
 * Triggered when: the initiating peer emits 'offer' with an SDP offer.
 * The server's role is purely to forward — it does not inspect the SDP.
 *
 * Flow:
 *   1. Validate payload via offerSchema
 *   2. If invalid: emit 'signaling-error' INVALID_PAYLOAD to sender
 *   3. Look up targetSocketId in the registry
 *   4. If not found: emit 'signaling-error' TARGET_NOT_FOUND to sender
 *   5. If found: forward the SDP offer to targetSocketId with sender metadata
 *
 * See: API_SPEC.md → offer event
 * See: ARCHITECTURE.md → WebRTC Signaling Flow
 */

import { Socket, Server } from 'socket.io';
import * as registry from '../../registry/registry';
import { offerSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onOffer(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    // Step 1 — Validate payload
    const result = offerSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('onOffer', 'Invalid offer payload', {
        socketId: socket.id,
        errors: result.error.flatten(),
      });
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'offer payload failed validation',
        context: { errors: result.error.flatten() },
      });
      return;
    }

    const { targetSocketId, sdp } = result.data;

    // Step 3 — Look up target in registry
    const targetEntry = registry.get(targetSocketId);
    if (!targetEntry) {
      logger.warn('onOffer', 'Target socket not found', {
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

    io.to(targetSocketId).emit('offer', {
      fromSocketId: socket.id,
      fromNodeId,
      sdp,
    });

    logger.debug('onOffer', `Forwarded SDP offer`, {
      from: socket.id,
      to: targetSocketId,
    });
  };
}
