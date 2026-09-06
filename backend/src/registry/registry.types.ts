/**
 * registry/registry.types.ts — type definitions local to the server registry
 *
 * These types are SERVER-ONLY. They are not exported from packages/shared
 * because the client never needs to know the internal registry structure.
 *
 * Types to define:
 *
 * interface RegistryEntry {
 *   nodeId: string;           // Persistent node ID (from JoinPayload)
 *   socketId: string;         // Ephemeral Socket.IO socket ID
 *   displayName: string;      // User-chosen display name
 *   protocolVersion: string;  // e.g. "1.0"
 *   connectedAt: number;      // Unix ms — Date.now() at join time
 *   lastActivityAt: number;   // Unix ms — updated on any event from this socket
 * }
 *
 * interface NodeSummary {
 *   // Public-facing shape returned by REST API and peer-list events
 *   // Subset of RegistryEntry — no internal fields
 *   nodeId: string;
 *   socketId: string;
 *   displayName: string;
 *   connectedAt: number;
 * }
 *
 * See: DATA_MODELS.md → SignalingModels section
 */
