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
 * Expo inlines EXPO_PUBLIC_ variables into the client bundle at build time.
 * The localhost fallback is intentionally for one-device development only;
 * it is never derived from the device currently running the app.
 */
const configuredSignalingUrl = process.env.EXPO_PUBLIC_SIGNALING_URL?.trim();

export const SIGNALING_URL: string =
  (configuredSignalingUrl || 'http://localhost:3001').replace(/\/+$/, '');

export const IS_SIGNALING_URL_CONFIGURED = Boolean(configuredSignalingUrl);

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
