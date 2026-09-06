/**
 * registry/registry.ts — in-memory peer registry
 *
 * This is the ONLY stateful module on the server.
 * It holds a Map<socketId, RegistryEntry> of all currently-connected peers.
 *
 * Implementation: module-level singleton Map (no class needed).
 *
 * See: DATA_MODELS.md → SignalingModels
 * See: API_SPEC.md → GET /api/nodes
 */

import { RegistryEntry, NodeSummary } from './registry.types';

/** Singleton in-memory peer registry. */
const registry = new Map<string, RegistryEntry>();

/**
 * upsert — add or update a registry entry for the given socketId.
 *
 * If an entry already exists for this socketId (e.g., reconnect scenario),
 * it is overwritten with the new entry.
 */
export function upsert(socketId: string, entry: RegistryEntry): void {
  // A reconnect gets a new Socket.IO id. Keep exactly one registry entry per
  // persistent Mirage node so peers do not try to negotiate with a stale tab.
  for (const [existingSocketId, existingEntry] of registry.entries()) {
    if (existingSocketId !== socketId && existingEntry.nodeId === entry.nodeId) {
      registry.delete(existingSocketId);
    }
  }
  registry.set(socketId, entry);
}

/**
 * remove — remove and return the entry for the given socketId.
 *
 * Returns undefined if not found (idempotent).
 */
export function remove(socketId: string): RegistryEntry | undefined {
  const entry = registry.get(socketId);
  registry.delete(socketId);
  return entry;
}

/**
 * get — return the entry for the given socketId.
 *
 * Returns undefined if not found.
 */
export function get(socketId: string): RegistryEntry | undefined {
  return registry.get(socketId);
}

/**
 * getByNodeId — look up a peer by their persistent nodeId (not socketId).
 *
 * Iterates all entries; O(n) but acceptable given small peer counts.
 */
export function getByNodeId(nodeId: string): RegistryEntry | undefined {
  for (const entry of registry.values()) {
    if (entry.nodeId === nodeId) {
      return entry;
    }
  }
  return undefined;
}

/**
 * getAll — return all current entries as an array.
 */
export function getAll(): RegistryEntry[] {
  return Array.from(registry.values());
}

/**
 * getAllExcept — return all entries except the one with the given socketId.
 *
 * Used to build the 'peer-list' response for a newly-joined client —
 * they should receive info about all OTHER peers, not themselves.
 */
export function getAllExcept(socketId: string): RegistryEntry[] {
  return Array.from(registry.values()).filter(
    (entry) => entry.socketId !== socketId
  );
}

/**
 * size — return the number of currently-connected peers.
 */
export function size(): number {
  return registry.size;
}

/**
 * toNodeSummary — convert a full RegistryEntry to the public NodeSummary shape.
 *
 * Strips internal fields (lastActivityAt, protocolVersion) before returning
 * the public-facing summary used in REST and Socket.IO events.
 */
export function toNodeSummary(entry: RegistryEntry): NodeSummary {
  return {
    nodeId: entry.nodeId,
    socketId: entry.socketId,
    displayName: entry.displayName,
    connectedAt: entry.connectedAt,
  };
}
