/**
 * registry/registry.ts — in-memory peer registry
 *
 * This is the ONLY stateful module on the server.
 * It holds a Map<socketId, RegistryEntry> of all currently-connected peers.
 *
 * Implemented as a module-level singleton Map — no class needed.
 */

import type { RegistryEntry, NodeSummary } from './registry.types';

// ── Singleton registry state ─────────────────────────────────────────────────
const registry = new Map<string, RegistryEntry>();

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * upsert — Add or update a registry entry for the given socketId.
 */
export function upsert(socketId: string, entry: RegistryEntry): void {
  registry.set(socketId, entry);
}

/**
 * remove — Remove and return the entry for the given socketId.
 * Returns undefined if not found (idempotent).
 */
export function remove(socketId: string): RegistryEntry | undefined {
  const entry = registry.get(socketId);
  registry.delete(socketId);
  return entry;
}

/**
 * get — Return the entry for the given socketId, or undefined.
 */
export function get(socketId: string): RegistryEntry | undefined {
  return registry.get(socketId);
}

/**
 * getByNodeId — Look up a peer by their persistent nodeId (not socketId).
 * Linear scan — acceptable for the small peer counts in the MVP.
 */
export function getByNodeId(nodeId: string): RegistryEntry | undefined {
  for (const entry of registry.values()) {
    if (entry.nodeId === nodeId) return entry;
  }
  return undefined;
}

/**
 * getAll — Return all current entries as an array.
 */
export function getAll(): RegistryEntry[] {
  return Array.from(registry.values());
}

/**
 * getAllExcept — Return all entries except the one with the given socketId.
 * Used to build the 'peer-list' response for a newly-joined client.
 */
export function getAllExcept(socketId: string): RegistryEntry[] {
  return Array.from(registry.values()).filter((e) => e.socketId !== socketId);
}

/**
 * size — Return the number of currently-connected peers.
 */
export function size(): number {
  return registry.size;
}

/**
 * toNodeSummary — Convert a full RegistryEntry to the public NodeSummary shape.
 */
export function toNodeSummary(entry: RegistryEntry): NodeSummary {
  return {
    nodeId: entry.nodeId,
    socketId: entry.socketId,
    displayName: entry.displayName,
    connectedAt: entry.connectedAt,
  };
}

/**
 * updateActivity — Touch lastActivityAt for the given socketId.
 * Called on every event received from the socket to keep the timestamp fresh.
 */
export function updateActivity(socketId: string): void {
  const entry = registry.get(socketId);
  if (entry) {
    entry.lastActivityAt = Date.now();
  }
}
