/**
 * app.ts — Express application factory
 *
 * Creates and configures the Express app instance.
 * - Applies middleware: cors, express.json()
 * - Mounts route handlers:
 *     GET /api/health  → routes/health.ts
 *     GET /api/nodes   → routes/nodes.ts
 * - Exports the configured app and http.Server
 *
 * Does NOT start listening — that is done in server.ts
 *
 * See: API_SPEC.md → REST Endpoints
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import healthRouter from './routes/health';
import nodesRouter from './routes/nodes';

// ── Parse CORS origins from environment ──────────────────────────────────────
const rawOrigins = process.env.CORS_ORIGINS ?? '*';
const corsOrigins: string | string[] =
  rawOrigins === '*' ? '*' : rawOrigins.split(',').map((o) => o.trim());

// ── Create Express app ────────────────────────────────────────────────────────
export const app = express();

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
  }),
);

app.use(express.json());

// ── Mount API routes ──────────────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', nodesRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
});

// ── HTTP server (for Socket.IO attachment) ────────────────────────────────────
export const httpServer = http.createServer(app);
