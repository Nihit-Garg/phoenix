import express, { Application } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import nodesRouter from './routes/nodes';

const corsOrigins = process.env.CORS_ORIGINS ?? '*';

export function createApp(): Application {
  const app = express();

  app.use(cors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(',').map(o => o.trim()),
    methods: ['GET'],
  }));

  app.use(express.json());

  // Mount REST routes.
  app.use('/api/health', healthRouter);
  app.use('/api/nodes', nodesRouter);

  // 404 fallback.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
