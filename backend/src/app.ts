/**
 * app.ts — Express application factory
 *
 * Creates and configures the Express app instance.
 * Does NOT start listening — that is done in server.ts.
 *
 * Middleware applied:
 *   - cors()         — allow all origins by default; restricted via CORS_ORIGINS env var
 *   - express.json() — parse JSON request bodies
 *
 * Routes mounted:
 *   GET /api/health  → routes/health.ts
 *   GET /api/nodes   → routes/nodes.ts (GET /api/nodes and GET /api/nodes/:nodeId)
 *
 * See: API_SPEC.md → REST Endpoints
 */

import express, { Application } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import nodesRouter from './routes/nodes';

/**
 * createApp — factory function that builds and returns the Express app.
 *
 * @returns The configured Express Application instance.
 */
export function createApp(): Application {
  const app = express();

  // --- Middleware ---

  // CORS — allow origins from CORS_ORIGINS env var (comma-separated), or all origins if not set
  const rawOrigins = process.env.CORS_ORIGINS;
  const corsOrigins: string | string[] = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim())
    : '*';

  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    })
  );

  // JSON body parser
  app.use(express.json());

  // --- Routes ---
  app.use('/api/health', healthRouter);
  app.use('/api/nodes', nodesRouter);

  return app;
}
