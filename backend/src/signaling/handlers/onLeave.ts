import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { leaveSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onLeave(socket: Socket, io: Server): void {
  socket.on('leave', (payload: unknown) => {
    // Payload is optional — don't reject on failure, just log.
    const result = leaveSchema.safeParse(payload ?? {});
    const reason = result.success ? result.data.reason : undefined;

    const entry = registry.remove(socket.id);

    if (!entry) {
      // Already cleaned up (shouldn't happen, but guard for safety).
      return;
    }

    // Broadcast departure to all remaining peers.
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'graceful',
    });

    logger.info('onLeave', `Node left gracefully: ${entry.displayName} (${entry.nodeId})`, {
      socketId: socket.id,
      reason,
      remainingPeers: registry.size(),
    });
  });
}
