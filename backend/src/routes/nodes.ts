import { Router, Request, Response } from 'express';
import { registry } from '../registry/registry';

const router = Router();

/** GET /api/nodes — return all currently connected nodes. */
router.get('/', (_req: Request, res: Response) => {
  const nodes = registry.getAll().map(registry.toSummary);
  res.json({ nodes, timestamp: Date.now() });
});

/** GET /api/nodes/:nodeId — look up a single node by persistent nodeId. */
router.get('/:nodeId', (req: Request, res: Response) => {
  const entry = registry.getByNodeId(req.params.nodeId);

  if (!entry) {
    res.status(404).json({ error: 'Node not found', nodeId: req.params.nodeId });
    return;
  }

  res.json({ node: registry.toSummary(entry) });
});

export default router;
