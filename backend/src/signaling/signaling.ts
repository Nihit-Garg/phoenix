import { Server } from 'socket.io';
import { onJoin } from './handlers/onJoin';
import { onOffer } from './handlers/onOffer';
import { onAnswer } from './handlers/onAnswer';
import { onIceCandidate } from './handlers/onIceCandidate';
import { onLeave } from './handlers/onLeave';
import { onDisconnect } from './handlers/onDisconnect';
import { logger } from '../utils/logger';

/**
 * Registers all Socket.IO event handlers on the server instance.
 * Called once from server.ts after Socket.IO is attached to the HTTP server.
 */
export function setupSignaling(io: Server): void {
  io.on('connection', (socket) => {
    logger.info('signaling', `Socket connected: ${socket.id}`);

    onJoin(socket, io);
    onOffer(socket, io);
    onAnswer(socket, io);
    onIceCandidate(socket, io);
    onLeave(socket, io);
    onDisconnect(socket, io);
  });
}
