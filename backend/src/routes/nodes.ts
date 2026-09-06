/**
 * routes/nodes.ts — GET /api/nodes and GET /api/nodes/:nodeId
 *
 * REST endpoints for peer discovery fallback. Clients can poll these if
 * the 'peer-list' Socket.IO event is missed.
 *
 * GET /api/nodes
 *   Returns all currently-connected nodes as NodeSummary[].
 *   Response: { nodes: NodeSummary[], timestamp: number }
 *
 * GET /api/nodes/:nodeId
 *   Returns a single node by its persistent nodeId.
 *   Response: { node: NodeSummary }
 *   Error: 404 if not found
 *
 * See: API_SPEC.md → GET /api/nodes and GET /api/nodes/:nodeId
 */

import { Router, Request, Response } from 'express';
import * as registry from '../registry/registry';

const router = Router();

/**
 * GET /api/nodes
 * Returns a snapshot of all currently-connected peers.
 */
router.get('/', (_req: Request, res: Response) => {
  const nodes = registry.getAll().map(registry.toNodeSummary);

  res.status(200).json({
    nodes,
    timestamp: Date.now(),
  });
});

/**
 * GET /api/nodes/:nodeId
 * Looks up a single connected peer by their persistent node ID.
 */
router.get('/:nodeId', (req: Request, res: Response) => {
  const { nodeId } = req.params;

  const entry = registry.getByNodeId(nodeId);
  if (!entry) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Node ${nodeId} is not currently connected`,
    });
    return;
  }

  res.status(200).json({
    node: registry.toNodeSummary(entry),
  });
});

export default router;
