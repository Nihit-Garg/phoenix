/**
 * routes/health.ts — GET /api/health
 *
 * Responsibilities:
 * - Return a 200 JSON response confirming the server is alive
 * - Import registry from registry/registry.ts to get connectedPeers count
 *
 * Response shape (see API_SPEC.md → GET /api/health):
 * {
 *   status: 'ok',
 *   serverTime: number,       // Date.now()
 *   connectedPeers: number,   // registry.size()
 *   version: string           // from package.json
 * }
 *
 * Error cases:
 * - 503 if server is shutting down (optional for MVP)
 */
