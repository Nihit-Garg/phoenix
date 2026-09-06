import { Router, Request, Response } from 'express';
import { registry } from '../registry/registry';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  // Lazy import to avoid circular dep — package.json is in project root.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../../package.json') as { version: string };

  res.json({
    status: 'ok',
    serverTime: Date.now(),
    connectedPeers: registry.size(),
    version,
  });
});

export default router;
