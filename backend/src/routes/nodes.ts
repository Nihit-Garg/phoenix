/**
 * routes/nodes.ts — GET /api/nodes and GET /api/nodes/:nodeId
 *
 * GET /api/nodes
 *   Returns all currently-connected nodes from the in-memory registry.
 *   Response: { nodes: NodeSummary[], timestamp: number }
 *
 * GET /api/nodes/:nodeId
 *   Looks up a single node by its persistent nodeId.
 *   Response: { node: NodeSummary }
 *   Error: 404 if not found
 *
 * See: API_SPEC.md → GET /api/nodes and GET /api/nodes/:nodeId
 */

import { Router } from 'express';
import * as registry from '../registry/registry';

const router = Router();

// GET /api/nodes — return all connected nodes
router.get('/nodes', (_req, res) => {
  const nodes = registry.getAll().map(registry.toNodeSummary);

  res.status(200).json({
    nodes,
    timestamp: Date.now(),
  });
});

// GET /api/nodes/:nodeId — return a single node by persistent nodeId
router.get('/nodes/:nodeId', (req, res) => {
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
