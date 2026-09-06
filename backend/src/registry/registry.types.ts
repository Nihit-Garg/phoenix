/**
 * registry/registry.types.ts — type definitions local to the server registry
 *
 * These types are SERVER-ONLY. They are not exported from packages/shared
 * because the client never needs to know the internal registry structure.
 *
 * See: DATA_MODELS.md → SignalingModels section
 */

/** Internal registry entry stored on the signaling server (in memory). */
export interface RegistryEntry {
  /** Persistent node ID (from JoinPayload). */
  nodeId: string;
  /** Ephemeral Socket.IO socket ID. */
  socketId: string;
  /** User-chosen display name. */
  displayName: string;
  /** Protocol version string, e.g. "1.0". */
  protocolVersion: string;
  /** Unix timestamp (ms) — Date.now() at join time. */
  connectedAt: number;
  /** Unix timestamp (ms) — updated on any event from this socket. */
  lastActivityAt: number;
}

/**
 * Public-facing shape returned by the REST API and peer-list events.
 * Subset of RegistryEntry — no internal fields exposed.
 */
export interface NodeSummary {
  /** Persistent node ID. */
  nodeId: string;
  /** Ephemeral Socket.IO socket ID. */
  socketId: string;
  /** User-chosen display name. */
  displayName: string;
  /** Unix timestamp (ms) when this socket connected. */
  connectedAt: number;
}
