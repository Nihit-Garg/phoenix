import { RegistryEntry, NodeSummary } from './registry.types';

// Single in-memory Map — the only stateful object on the server.
const store = new Map<string, RegistryEntry>();

export const registry = {
  /** Add or update an entry keyed by socketId. */
  upsert(socketId: string, entry: RegistryEntry): void {
    store.set(socketId, entry);
  },

  /** Remove an entry and return it. Returns undefined if not found. */
  remove(socketId: string): RegistryEntry | undefined {
    const entry = store.get(socketId);
    store.delete(socketId);
    return entry;
  },

  /** Look up by socketId. */
  get(socketId: string): RegistryEntry | undefined {
    return store.get(socketId);
  },

  /** Look up by persistent nodeId (linear scan — acceptable for ≤50 peers). */
  getByNodeId(nodeId: string): RegistryEntry | undefined {
    for (const entry of store.values()) {
      if (entry.nodeId === nodeId) return entry;
    }
    return undefined;
  },

  /** All entries as an array. */
  getAll(): RegistryEntry[] {
    return Array.from(store.values());
  },

  /** All entries except the one with the given socketId. */
  getAllExcept(socketId: string): RegistryEntry[] {
    return Array.from(store.values()).filter(e => e.socketId !== socketId);
  },

  /** Current peer count. */
  size(): number {
    return store.size;
  },

  /** Update the lastActivityAt timestamp for a socket. */
  touch(socketId: string): void {
    const entry = store.get(socketId);
    if (entry) entry.lastActivityAt = Date.now();
  },

  /** Convert a full RegistryEntry to the public-facing NodeSummary shape. */
  toSummary(entry: RegistryEntry): NodeSummary {
    return {
      nodeId: entry.nodeId,
      socketId: entry.socketId,
      displayName: entry.displayName,
      connectedAt: entry.connectedAt,
    };
  },
};
