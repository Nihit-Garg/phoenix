import { Socket, Server } from 'socket.io';
import { registry } from '../../registry/registry';
import { joinSchema } from '../validation';
import { logger } from '../../utils/logger';

export function onJoin(socket: Socket, io: Server): void {
  socket.on('join', (payload: unknown) => {
    const result = joinSchema.safeParse(payload);

    if (!result.success) {
      socket.emit('signaling-error', {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid join payload',
        context: result.error.flatten(),
      });
      logger.warn('onJoin', 'Invalid join payload', { socketId: socket.id });
      return;
    }

    const { nodeId, displayName, protocolVersion } = result.data;
    const now = Date.now();

    registry.upsert(socket.id, {
      nodeId,
      socketId: socket.id,
      displayName,
      protocolVersion,
      connectedAt: now,
      lastActivityAt: now,
    });

    // Send all current peers to the joining client (excluding self).
    const existingPeers = registry.getAllExcept(socket.id).map(registry.toSummary);
    socket.emit('peer-list', { peers: existingPeers });

    // Notify all other connected clients about the new peer.
    const newPeerSummary = registry.toSummary(registry.get(socket.id)!);
    socket.broadcast.emit('new-peer', { peer: newPeerSummary });

    logger.info('onJoin', `Node joined: ${displayName} (${nodeId})`, {
      socketId: socket.id,
      totalPeers: registry.size(),
    });
  });
}
