

/**
 * signaling/signaling.ts — Socket.IO namespace setup
 *
 * Exports a single function: setupSignaling(io: Server): void
 *
 * Called once at server startup (from server.ts) after the HTTP server
 * and Socket.IO instance are created.
 *
 * For each connected socket, registers all event handlers:
 *   - 'join'          → onJoin
 *   - 'offer'         → onOffer
 *   - 'answer'        → onAnswer
 *   - 'ice-candidate' → onIceCandidate
 *   - 'leave'         → onLeave
 *   - 'disconnect'    → onDisconnect
 *
 * See: API_SPEC.md → Socket.IO Events
 */

import { Server } from 'socket.io';
import { onJoin } from './handlers/onJoin';
import { onOffer } from './handlers/onOffer';
import { onAnswer } from './handlers/onAnswer';
import { onIceCandidate } from './handlers/onIceCandidate';
import { onLeave } from './handlers/onLeave';
import { onDisconnect } from './handlers/onDisconnect';
import { logger } from '../utils/logger';

/**
 * setupSignaling — register all Socket.IO event handlers on the server.
 *
 * @param io - The Socket.IO Server instance (already attached to the HTTP server).
 */
export function setupSignaling(io: Server): void {
  io.on('connection', (socket) => {
    logger.info('signaling', `Socket connected`, { socketId: socket.id });

    // Register all event handlers for this socket
    socket.on('join',          onJoin(socket, io));
    socket.on('offer',         onOffer(socket, io));
    socket.on('answer',        onAnswer(socket, io));
    socket.on('ice-candidate', onIceCandidate(socket, io));
    socket.on('leave',         onLeave(socket, io));
    socket.on('disconnect',    onDisconnect(socket, io));
  });

  logger.info('signaling', 'Socket.IO signaling handlers registered');
}
