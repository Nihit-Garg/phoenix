import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { offerSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onOffer(socket: Socket, io: Server): void {
  socket.on('offer', (payload: unknown) => {
    const result = offerSchema.safeParse(payload);

    if (!result.success) {
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid offer payload',
        context: result.error.flatten(),
      });
      return;
    }

    const { targetSocketId, sdp } = result.data;
    const sender = registry.get(socket.id);

    // Check target exists in Socket.IO server.
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      socket.emit('signaling-error', {
        code: 'TARGET_NOT_FOUND',
        message: `Target socket ${targetSocketId} is not connected`,
      });
      logger.warn('onOffer', 'Target not found', { targetSocketId });
      return;
    }

    registry.touch(socket.id);

    targetSocket.emit('offer', {
      fromSocketId: socket.id,
      fromNodeId: sender?.nodeId ?? 'unknown',
      sdp,
    });

    logger.debug('onOffer', 'Forwarded SDP offer', {
      from: socket.id,
      to: targetSocketId,
    });
  });
}
