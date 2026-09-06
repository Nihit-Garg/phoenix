/**
 * app.ts — Express application factory
 *
 * Responsibilities:
 * - Create and configure the Express app instance
 * - Apply middleware: cors (use CORS_ORIGINS from env), express.json()
 * - Mount route handlers:
 *     GET /api/health  → routes/health.ts
 *     GET /api/nodes   → routes/nodes.ts
 * - Export the configured app (and optionally the http.Server)
 *
 * Does NOT start listening — that is done in server.ts
 *
 * See: API_SPEC.md → REST Endpoints
 */
