/**
 * routes/health.ts — GET /api/health
 *
 * Liveness probe endpoint. Clients call this on startup to verify
 * the signaling server is reachable before attempting Socket.IO connection.
 *
 * Response (200 OK):
 * {
 *   status: 'ok',
 *   serverTime: number,       // Date.now()
 *   connectedPeers: number,   // registry.size()
 *   version: string           // from package.json
 * }
 *
 * See: API_SPEC.md → GET /api/health
 */

import { Router, Request, Response } from 'express';
import * as registry from '../registry/registry';

// Import version from package.json (resolveJsonModule: true in tsconfig)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string };

const router = Router();

/**
 * GET /api/health
 * Returns server liveness status and current peer count.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    serverTime: Date.now(),
    connectedPeers: registry.size(),
    version,
  });
});

export default router;
