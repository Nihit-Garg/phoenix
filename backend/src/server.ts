/**
 * server.ts — Entry point
 *
 * Responsibilities:
 * - Create the HTTP server from the Express app (imported from app.ts)
 * - Attach Socket.IO to the HTTP server
 * - Call setupSignaling(io) to register all Socket.IO handlers
 * - Start listening on PORT (from env, default 3001)
 * - Print the server's local LAN IP address on startup using utils/network.ts
 *   so teammates can copy it into their .env
 *
 * Exports: nothing (entry point only)
 *
 * See: API_SPEC.md → Connection Lifecycle
 */
