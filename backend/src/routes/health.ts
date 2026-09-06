/**
 * routes/health.ts — GET /api/health
 *
 * Returns a 200 JSON response confirming the server is alive.
 * Imports registry to get connectedPeers count.
 *
 * Response shape (see API_SPEC.md → GET /api/health):
 * {
 *   status: 'ok',
 *   serverTime: number,       // Date.now()
 *   connectedPeers: number,   // registry.size()
 *   version: string           // from package.json
 * }
 */

import { Router } from 'express';
import { size } from '../registry/registry';
import { version } from '../../package.json';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    serverTime: Date.now(),
    connectedPeers: size(),
    version,
  });
});

export default router;
