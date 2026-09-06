import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { logger } from '../../utils/logger';

export function onDisconnect(socket: Socket, io: Server): void {
  socket.on('disconnect', (reason: string) => {
    // Idempotent — if onLeave already removed this entry, do nothing.
    const entry = registry.remove(socket.id);

    if (!entry) {
      // Already cleaned up by onLeave.
      return;
    }

    // Broadcast departure to remaining peers.
    socket.broadcast.emit('peer-left', {
      nodeId: entry.nodeId,
      socketId: socket.id,
      reason: 'socket-disconnect',
    });

    logger.info('onDisconnect', `Socket disconnected: ${entry.displayName} (${entry.nodeId})`, {
      socketId: socket.id,
      reason,
      remainingPeers: registry.size(),
    });
  });
}
