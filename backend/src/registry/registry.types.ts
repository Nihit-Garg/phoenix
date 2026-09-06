/**
 * registry/registry.types.ts — type definitions local to the server registry
 *
 * These types are SERVER-ONLY. They are not exported from packages/shared
 * because the client never needs to know the internal registry structure.
 */

/**
 * Internal registry entry stored on the signaling server (in memory).
 * One entry per connected socket.
 */
export interface RegistryEntry {
  /** Persistent node ID (from JoinPayload). */
  nodeId: string;
  /** Ephemeral Socket.IO socket ID. */
  socketId: string;
  /** User-chosen display name. */
  displayName: string;
  /** Protocol version string e.g. "1.0". */
  protocolVersion: string;
  /** Unix ms — Date.now() at join time. */
  connectedAt: number;
  /** Unix ms — updated on any event from this socket. */
  lastActivityAt: number;
}

/**
 * Lightweight summary returned by REST API and peer-list events.
 * Does not include routing or internal fields.
 */
export interface NodeSummary {
  nodeId: string;
  socketId: string;
  displayName: string;
  connectedAt: number;
}
