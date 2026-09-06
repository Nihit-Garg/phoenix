/**
 * frontend/src/engine/PacketRouter.ts
 *
 * Distance-vector routing table and next-hop resolution.
 *
 * Maintains a RoutingTable (Map<destId, RoutingEntry>).
 * Updated on HELLO and ROUTE_UPDATE packets.
 * Queried by MeshEngine before every packet forward.
 */

import { RoutingEntry, RoutingTable } from './types';

export class PacketRouter {
  private table: RoutingTable = new Map();
  private localNodeId = '';

  init(localNodeId: string): void {
    this.localNodeId = localNodeId;
  }

  // ─── Query ──────────────────────────────────────────────────────────────────

  /**
   * Returns the best RoutingEntry for destId, or undefined if no route.
   * Prefers lowest hopCount among all entries.
   */
  getNextHop(destId: string): RoutingEntry | undefined {
    return this.table.get(destId);
  }

  hasRoute(destId: string): boolean {
    return this.table.has(destId);
  }

  getTable(): RoutingEntry[] {
    return Array.from(this.table.values());
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  /**
   * Called when a HELLO or ROUTE_UPDATE is received from a direct neighbour.
   *
   * Bellman-Ford merge: for each route in the received table, if
   *   (neighbour_hopCount + 1) < our current hopCount → update our entry.
   *
   * @param fromNodeId  The direct neighbour we received this from
   * @param routes      Their routing table snapshot
   * @returns true if any entry was updated (triggers 'route-updated' event)
   */
  mergeRoutes(fromNodeId: string, routes: RoutingEntry[]): boolean {
    let changed = false;

    // 1. Ensure we have a direct route to the neighbour (hopCount=1)
    const existing = this.table.get(fromNodeId);
    if (!existing || existing.hopCount > 1) {
      this.table.set(fromNodeId, {
        destId:      fromNodeId,
        nextHopId:   fromNodeId,
        hopCount:    1,
        lastUpdated: Date.now(),
      });
      changed = true;
    }

    // 2. Merge their routes (Bellman-Ford)
    for (const entry of routes) {
      if (entry.destId === this.localNodeId) continue; // skip self-routes

      const candidate = entry.hopCount + 1;
      const current   = this.table.get(entry.destId);

      if (!current || candidate < current.hopCount) {
        this.table.set(entry.destId, {
          destId:      entry.destId,
          nextHopId:   fromNodeId,  // route via the neighbour who told us
          hopCount:    candidate,
          lastUpdated: Date.now(),
        });
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Remove all routes that go through a dead neighbour.
   * Called by HeartbeatManager when a peer is declared dead.
   */
  removePeer(deadNodeId: string): boolean {
    let changed = false;

    for (const [destId, entry] of this.table.entries()) {
      if (entry.nextHopId === deadNodeId || entry.destId === deadNodeId) {
        this.table.delete(destId);
        changed = true;
      }
    }

    return changed;
  }

  clear(): void {
    this.table.clear();
  }
}
