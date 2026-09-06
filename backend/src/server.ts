import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { setupSignaling } from './signaling/signaling';
import { getLanIp, getServerUrl } from './utils/network';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGINS = process.env.CORS_ORIGINS ?? '*';

async function main(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CORS_ORIGINS === '*' ? '*' : CORS_ORIGINS.split(',').map(o => o.trim()),
      methods: ['GET', 'POST'],
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT ?? '20000', 10),
  });

  setupSignaling(io);

  httpServer.listen(PORT, '0.0.0.0', () => {
    const lanUrl = getServerUrl(PORT);
    const localUrl = `http://localhost:${PORT}`;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║           MIRAGE Signaling Server                ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Local:   ${localUrl.padEnd(39)}║`);
    console.log(`║  Network: ${lanUrl.padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  Set on other machines:                          ║');
    console.log(`║  NEXT_PUBLIC_SIGNALING_URL=${lanUrl.padEnd(23)}║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\n');

    logger.info('server', `Listening on port ${PORT}`, { lanUrl, localUrl });
  });

  // Graceful shutdown.
  process.on('SIGTERM', () => {
    logger.info('server', 'SIGTERM received — shutting down');
    io.close();
    httpServer.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.info('server', 'SIGINT received — shutting down');
    io.close();
    httpServer.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
