/**
 * signaling/handlers/onOffer.ts — handles the 'offer' event
 *
 * Triggered when: the initiating peer emits 'offer' with an SDP offer.
 *
 * 1. Validates payload (Zod: OfferPayload).
 * 2. Checks that targetSocketId exists in the Socket.IO server.
 * 3. If not found: emits 'signaling-error' with code 'TARGET_NOT_FOUND' to sender.
 * 4. If found: forwards the SDP offer to targetSocketId with sender info attached.
 *
 * See: API_SPEC.md → offer event
 */

import type { Server, Socket } from 'socket.io';
import * as registry from '../../registry/registry';
import { offerSchema, emitSignalingError } from '../validation';
import { logger } from '../../utils/logger';

export function onOffer(socket: Socket, io: Server) {
  return (payload: unknown): void => {
    registry.updateActivity(socket.id);

    const result = offerSchema.safeParse(payload);

    if (!result.success) {
      emitSignalingError(socket, 'INVALID_PAYLOAD', 'Invalid offer payload', {
        errors: result.error.flatten(),
      });
      logger.warn('onOffer', `Invalid offer payload from socket ${socket.id}`);
      return;
    }

    const { targetSocketId, sdp } = result.data;

    // Check target exists
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      emitSignalingError(socket, 'TARGET_NOT_FOUND', `Target socket ${targetSocketId} not found`);
      logger.warn('onOffer', `Target socket not found: ${targetSocketId}`, {
        fromSocketId: socket.id,
      });
      return;
    }

    // Look up the sender's nodeId from the registry
    const senderEntry = registry.get(socket.id);
    const fromNodeId = senderEntry?.nodeId ?? 'unknown';

    // Forward the offer to the target with sender metadata attached
    targetSocket.emit('offer', {
      fromSocketId: socket.id,
      fromNodeId,
      sdp,
    });

    logger.debug('onOffer', `Forwarded offer from ${fromNodeId} to ${targetSocketId}`);
  };
}
