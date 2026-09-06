import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { iceCandidateSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onIceCandidate(socket: Socket, io: Server): void {
  socket.on('ice-candidate', (payload: unknown) => {
    const result = iceCandidateSchema.safeParse(payload);

    if (!result.success) {
      // Silently drop malformed ICE candidates — they are not critical.
      logger.warn('onIceCandidate', 'Invalid ICE candidate payload, dropped', {
        socketId: socket.id,
      });
      return;
    }

    const { targetSocketId, candidate } = result.data;

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      // Silently drop — ICE negotiation is tolerant of lost candidates.
      logger.debug('onIceCandidate', 'Target not found, candidate dropped', {
        targetSocketId,
      });
      return;
    }

    registry.touch(socket.id);

    const sender = registry.get(socket.id);
    targetSocket.emit('ice-candidate', {
      fromSocketId: socket.id,
      fromNodeId: sender?.nodeId ?? 'unknown',
      candidate,
    });
  });
}
