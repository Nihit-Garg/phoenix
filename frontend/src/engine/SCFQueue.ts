/**
 * frontend/src/engine/SCFQueue.ts
 *
 * Store-Carry-Forward queue.
 *
 * When no route exists for a packet's destination, it is held here
 * until a new neighbour appears and a route becomes available.
 *
 * Priority ordering: EMERGENCY > HIGH > NORMAL > LOW
 * Within same priority: FIFO (by enqueuedAt).
 *
 * See: ARCHITECTURE.md § 7. Store-Carry-Forward Workflow
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MiragePacket, PacketPriority, QueueEntry } from './types';

const PRIORITY_WEIGHT: Record<PacketPriority, number> = {
  EMERGENCY: 4, HIGH: 3, NORMAL: 2, LOW: 1,
};

const STORAGE_KEY = '@mirage/scfQueue';
const RETENTION_MS: Record<PacketPriority, number> = {
  EMERGENCY: 30 * 60 * 1000,
  HIGH: 15 * 60 * 1000,
  NORMAL: 5 * 60 * 1000,
  LOW: 2 * 60 * 1000,
};

export class SCFQueue {
  private queue: QueueEntry[] = [];

  async hydrate(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const restored = JSON.parse(raw) as QueueEntry[];
      this.queue = restored.filter((entry) => entry.expiresAt > Date.now());
      this._sort();
      await this._persist();
    } catch (error) {
      console.warn('[SCFQueue] Could not restore queued packets', error);
      this.queue = [];
    }
  }

  enqueue(packet: MiragePacket): QueueEntry {
    const now = Date.now();
    const entry: QueueEntry = {
      id:          `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      packet,
      enqueuedAt:  now,
      expiresAt:   now + RETENTION_MS[packet.priority],
      attempts:    0,
    };
    this.queue.push(entry);
    this._sort();
    void this._persist();
    return entry;
  }

  /** Remove and return all entries that now have a routable destination. */
  drainRoutable(hasRoute: (destId: string) => boolean): QueueEntry[] {
    const routable: QueueEntry[] = [];
    const remaining: QueueEntry[] = [];

    const now = Date.now();
    for (const entry of this.queue) {
      if (entry.expiresAt <= now) continue;
      if (entry.packet.destId === '*' || hasRoute(entry.packet.destId)) {
        routable.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    this.queue = remaining;
    void this._persist();
    return routable; // already sorted by priority
  }

  remove(entryId: string): void {
    this.queue = this.queue.filter(e => e.id !== entryId);
    void this._persist();
  }

  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  get depth(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    void AsyncStorage.removeItem(STORAGE_KEY).catch((error) =>
      console.warn('[SCFQueue] Could not clear queued packets', error)
    );
  }

  private _sort(): void {
    this.queue.sort((a, b) => {
      const pDiff = PRIORITY_WEIGHT[b.packet.priority] - PRIORITY_WEIGHT[a.packet.priority];
      return pDiff !== 0 ? pDiff : a.enqueuedAt - b.enqueuedAt;
    });
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('[SCFQueue] Could not persist queued packets', error);
    }
  }
}
