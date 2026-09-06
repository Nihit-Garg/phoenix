/**
 * server.ts — Entry point
 *
 * 1. Creates the HTTP server from the Express app (imported from app.ts)
 * 2. Attaches Socket.IO to the HTTP server
 * 3. Calls setupSignaling(io) to register all Socket.IO handlers
 * 4. Starts listening on PORT (from env, default 3001)
 * 5. Prints the server's local LAN IP address on startup using utils/network.ts
 *    so teammates can copy it into their .env
 *
 * See: API_SPEC.md → Connection Lifecycle
 */

import { Server as SocketIOServer } from 'socket.io';
import { httpServer } from './app';
import { setupSignaling } from './signaling/signaling';
import { getLanIp, getServerUrl } from './utils/network';
import { logger } from './utils/logger';

// ── Configuration ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const rawOrigins = process.env.CORS_ORIGINS ?? '*';
const corsOrigins: string | string[] =
  rawOrigins === '*' ? '*' : rawOrigins.split(',').map((o) => o.trim());

// ── Attach Socket.IO ──────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT ?? '20000', 10),
  transports: ['websocket', 'polling'],
});

// ── Register all signaling event handlers ────────────────────────────────────
setupSignaling(io);

// ── Start listening ───────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanIp();
  const serverUrl = getServerUrl(PORT);

  logger.info('server', '══════════════════════════════════════════════');
  logger.info('server', '  MIRAGE Signaling Server — Started');
  logger.info('server', '══════════════════════════════════════════════');
  logger.info('server', `  Local:    http://localhost:${PORT}`);
  logger.info('server', `  LAN URL:  ${serverUrl}`);
  logger.info('server', `  LAN IP:   ${lanIp}`);
  logger.info('server', '  ──────────────────────────────────────────');
  logger.info('server', '  Share the LAN URL with your teammates!');
  logger.info('server', '══════════════════════════════════════════════');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  logger.info('server', 'Received SIGINT — shutting down gracefully...');
  io.close(() => {
    httpServer.close(() => {
      logger.info('server', 'Server closed. Goodbye.');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  logger.info('server', 'Received SIGTERM — shutting down gracefully...');
  io.close(() => {
    httpServer.close(() => {
      logger.info('server', 'Server closed. Goodbye.');
      process.exit(0);
    });
  });
});
