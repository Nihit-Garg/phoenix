import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { answerSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onAnswer(socket: Socket, io: Server): void {
  socket.on('answer', (payload: unknown) => {
    const result = answerSchema.safeParse(payload);

    if (!result.success) {
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid answer payload',
        context: result.error.flatten(),
      });
      return;
    }

    const { targetSocketId, sdp } = result.data;
    const sender = registry.get(socket.id);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      socket.emit('signaling-error', {
        code: 'TARGET_NOT_FOUND',
        message: `Target socket ${targetSocketId} is not connected`,
      });
      logger.warn('onAnswer', 'Target not found', { targetSocketId });
      return;
    }

    registry.touch(socket.id);

    targetSocket.emit('answer', {
      fromSocketId: socket.id,
      fromNodeId: sender?.nodeId ?? 'unknown',
      sdp,
    });

    logger.debug('onAnswer', 'Forwarded SDP answer', {
      from: socket.id,
      to: targetSocketId,
    });
  });
}
