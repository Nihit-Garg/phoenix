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

import { MiragePacket, PacketPriority, QueueEntry } from './types';

const PRIORITY_WEIGHT: Record<PacketPriority, number> = {
  EMERGENCY: 4, HIGH: 3, NORMAL: 2, LOW: 1,
};

export class SCFQueue {
  private queue: QueueEntry[] = [];

  enqueue(packet: MiragePacket): QueueEntry {
    const entry: QueueEntry = {
      id:          `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      packet,
      enqueuedAt:  Date.now(),
    };
    this.queue.push(entry);
    this._sort();
    return entry;
  }

  /** Remove and return all entries that now have a routable destination. */
  drainRoutable(hasRoute: (destId: string) => boolean): QueueEntry[] {
    const routable: QueueEntry[] = [];
    const remaining: QueueEntry[] = [];

    for (const entry of this.queue) {
      if (entry.packet.destId === '*' || hasRoute(entry.packet.destId)) {
        routable.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    this.queue = remaining;
    return routable; // already sorted by priority
  }

  remove(entryId: string): void {
    this.queue = this.queue.filter(e => e.id !== entryId);
  }

  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  get depth(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  private _sort(): void {
    this.queue.sort((a, b) => {
      const pDiff = PRIORITY_WEIGHT[b.packet.priority] - PRIORITY_WEIGHT[a.packet.priority];
      return pDiff !== 0 ? pDiff : a.enqueuedAt - b.enqueuedAt;
    });
  }
}
