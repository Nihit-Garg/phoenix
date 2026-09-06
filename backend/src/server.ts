/**
 * server.ts — Entry point
 *
 * Responsibilities:
 *   1. Create the Express app via createApp()
 *   2. Create an HTTP server from the Express app
 *   3. Attach Socket.IO to the HTTP server with CORS config
 *   4. Call setupSignaling(io) to register all Socket.IO handlers
 *   5. Start listening on PORT (default 3001)
 *   6. Print the server's LAN IP address on startup so teammates can configure .env
 *
 * Exports: nothing (this is the entry point only)
 *
 * See: API_SPEC.md → Connection Lifecycle
 */

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { setupSignaling } from './signaling/signaling';
import { getLanIp, getServerUrl } from './utils/network';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// 1. Create the Express app
const app = createApp();

// 2. Create the HTTP server
const httpServer = http.createServer(app);

// CORS origins — same source as app.ts for consistency
const rawOrigins = process.env.CORS_ORIGINS;
const corsOrigins: string | string[] = rawOrigins
  ? rawOrigins.split(',').map((o) => o.trim())
  : '*';

// 3. Attach Socket.IO to the HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
  // Ping/pong timeout — clients dead-detected after this period of silence
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT ?? '20000', 10),
  pingInterval: 5000,
});

// 4. Register all Socket.IO signaling handlers
setupSignaling(io);

// Enforce MAX_PEERS connection limit
const MAX_PEERS = parseInt(process.env.MAX_PEERS ?? '50', 10);
io.use((_socket, next) => {
  const currentCount = io.engine.clientsCount;
  if (currentCount >= MAX_PEERS) {
    next(new Error(`Server at capacity (${MAX_PEERS} peers max)`));
  } else {
    next();
  }
});

// 5. Start listening
httpServer.listen(PORT, () => {
  const lanIp = getLanIp();
  const serverUrl = getServerUrl(PORT);

  logger.info('server', '═══════════════════════════════════════════');
  logger.info('server', '  MIRAGE Signaling Server');
  logger.info('server', '═══════════════════════════════════════════');
  logger.info('server', `  Local:    http://localhost:${PORT}`);
  logger.info('server', `  LAN:      ${serverUrl}`);
  logger.info('server', `  LAN IP:   ${lanIp}`);
  logger.info('server', '───────────────────────────────────────────');
  logger.info('server', '  Copy the LAN URL into your frontend .env:');
  logger.info('server', `  EXPO_PUBLIC_SIGNALING_URL=${serverUrl}`);
  logger.info('server', '  Set LAN_IP in backend/.env if this is not your Wi-Fi adapter IP.');
  logger.info('server', '═══════════════════════════════════════════');
});

// Graceful shutdown on SIGINT/SIGTERM
function shutdown(signal: string): void {
  logger.info('server', `Received ${signal} — shutting down gracefully`);
  httpServer.close(() => {
    logger.info('server', 'HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
