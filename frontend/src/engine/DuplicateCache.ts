/**
 * frontend/src/engine/DuplicateCache.ts
 *
 * Seen-packet cache — prevents forwarding a packet more than once.
 *
 * Every node maintains a set of packetIds it has already processed.
 * Before forwarding any packet, check this cache first.
 * Entries are evicted after TTL_MS to prevent unbounded memory growth.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SIZE     = 2000;            // evict oldest when over limit

interface CacheEntry {
  seenAt: number;
}

export class DuplicateCache {
  private cache = new Map<string, CacheEntry>();

  /** Returns true if this packetId has already been seen. */
  has(packetId: string): boolean {
    const entry = this.cache.get(packetId);
    if (!entry) return false;

    // Treat as expired
    if (Date.now() - entry.seenAt > CACHE_TTL_MS) {
      this.cache.delete(packetId);
      return false;
    }

    return true;
  }

  /** Mark a packetId as seen. */
  add(packetId: string): void {
    if (this.cache.size >= MAX_SIZE) {
      // Evict the oldest entry
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(packetId, { seenAt: Date.now() });
  }

  /** Convenience — returns true if the packet is a duplicate (already seen). */
  isDuplicate(packetId: string): boolean {
    if (this.has(packetId)) return true;
    this.add(packetId);
    return false;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
