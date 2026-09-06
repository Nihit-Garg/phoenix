/**
 * src/lib/constants.ts
 *
 * Single source of truth for all frontend-accessible configuration.
 * Read env vars here — never scatter process.env access across the codebase.
 */

// ─── Signaling Server ─────────────────────────────────────────────────────────

/**
 * URL of the MIRAGE signaling server.
 * Set EXPO_PUBLIC_SIGNALING_URL in your .env file to the LAN URL printed at
 * server startup, e.g.:
 *   EXPO_PUBLIC_SIGNALING_URL=http://192.168.1.42:3001
 *
 * Falls back to localhost for solo development.
 */
export const SIGNALING_URL: string =
  process.env.EXPO_PUBLIC_SIGNALING_URL ?? 'http://localhost:3001';

// ─── Protocol ─────────────────────────────────────────────────────────────────

export const PROTOCOL_VERSION = '1.0';

export const NODE_ID_PREFIX = 'node';

/** Max display name length — mirrors backend Zod schema (max 32). */
export const MAX_DISPLAY_NAME_LENGTH = 32;

/** Key used by AsyncStorage to persist the node identity. */
export const NODE_ID_STORAGE_KEY = '@mirage/nodeId';
export const DISPLAY_NAME_STORAGE_KEY = '@mirage/displayName';

// ─── Timing ───────────────────────────────────────────────────────────────────

/** How long (ms) to wait before retrying a failed signaling connection. */
export const RECONNECT_DELAY_MS = 3000;
