/**
 * signaling/signaling.ts — Socket.IO namespace setup
 *
 * Accepts an `io: Server` (Socket.IO Server instance).
 * Registers connection handler and all event handlers for each socket.
 *
 * Exports: setupSignaling(io: Server): void
 *
 * See: API_SPEC.md → Socket.IO Events
 */

import type { Server } from 'socket.io';
import { onJoin } from './handlers/onJoin';
import { onOffer } from './handlers/onOffer';
import { onAnswer } from './handlers/onAnswer';
import { onIceCandidate } from './handlers/onIceCandidate';
import { onLeave } from './handlers/onLeave';
import { onDisconnect } from './handlers/onDisconnect';
import { logger } from '../utils/logger';

/**
 * setupSignaling — registers all Socket.IO event handlers.
 * Called once at server startup from server.ts.
 */
export function setupSignaling(io: Server): void {
  io.on('connection', (socket) => {
    logger.info('signaling', `Socket connected: ${socket.id}`, {
      transport: socket.conn.transport.name,
    });

    // Register all event handlers
    socket.on('join', onJoin(socket, io));
    socket.on('offer', onOffer(socket, io));
    socket.on('answer', onAnswer(socket, io));
    socket.on('ice-candidate', onIceCandidate(socket, io));
    socket.on('leave', onLeave(socket, io));
    socket.on('disconnect', onDisconnect(socket, io));
  });

  logger.info('signaling', 'Socket.IO signaling handlers registered');
}
