# MIRAGE — Protocol Specification

> Formal specification of the Mirage mesh networking protocol.
> All types are defined in TypeScript interface syntax. No implementation is provided.

---

## Table of Contents

1. [Packet Format](#1-packet-format)
2. [Packet Headers](#2-packet-headers)
3. [Message Types](#3-message-types)
4. [Priority Levels](#4-priority-levels)
5. [TTL Behaviour](#5-ttl-behaviour)
6. [Hop Count](#6-hop-count)
7. [Duplicate Detection](#7-duplicate-detection)
8. [Packet IDs](#8-packet-ids)
9. [Routing Table Structure](#9-routing-table-structure)
10. [Heartbeat Format](#10-heartbeat-format)

---

## 1. Packet Format

All Mirage protocol messages are serialised as JSON strings and transmitted over WebRTC DataChannels. The DataChannel is configured with `ordered: false` and `maxRetransmits: 0` for low-latency delivery. Application-layer acknowledgement is not required for this MVP.

### Wire Format

```
[JSON string, UTF-8 encoded]
→ sent via RTCDataChannel.send(jsonString)
```

Every message sent over a DataChannel must conform to the `MiragePacket` interface.

---

## 2. Packet Headers

```typescript
/**
 * MiragePacket — the atomic unit of transmission in the Mirage protocol.
 *
 * Every message, heartbeat, HELLO, and emergency broadcast is a MiragePacket.
 * The `type` field determines how the payload is interpreted.
 */
interface MiragePacket {
  // ── Routing Header ────────────────────────────────────────────────────────
  
  /** 
   * Globally unique identifier for this packet.
   * Format: `${originNodeId}-${Date.now()}-${crypto.randomUUID()}`
   * Used for duplicate detection at every hop.
   */
  packetId: string;

  /** 
   * Node ID of the original sender.
   * Does not change as the packet traverses hops.
   */
  originId: string;

  /** 
   * Node ID of the intended final recipient.
   * For broadcast packets, set to the constant BROADCAST_ADDRESS = "*".
   */
  destId: string;

  /** 
   * Node ID of the node that sent this specific copy of the packet.
   * Changes at every hop. Used for ACK and routing feedback.
   */
  senderId: string;

  /** 
   * Remaining number of hops this packet may traverse.
   * Decremented by 1 at every forwarding node.
   * Packet is dropped when TTL reaches 0 before delivery.
   */
  ttl: number;

  /** 
   * Number of hops this packet has already traversed.
   * Incremented by 1 at every forwarding node.
   * Used for distance estimation in routing table updates.
   */
  hopCount: number;

  // ── Classification Header ─────────────────────────────────────────────────

  /** Discriminated union tag; determines payload shape. */
  type: MiragePacketType;

  /** Delivery priority. Higher priority packets are forwarded first. */
  priority: PacketPriority;

  // ── Timing Header ─────────────────────────────────────────────────────────

  /** Unix timestamp (ms) when the packet was originally created. */
  createdAt: number;

  /** Unix timestamp (ms) of the most recent forward event. */
  lastForwardedAt: number;

  // ── Payload ───────────────────────────────────────────────────────────────

  /** 
   * Type-safe payload. Shape determined by `type` field.
   * See MessagePayload union type below.
   */
  payload: MessagePayload;

  // ── Trace (Optional) ──────────────────────────────────────────────────────

  /** 
   * Ordered list of node IDs this packet has passed through.
   * Each forwarding node appends its own nodeId.
   * Used for visualisation in the UI packet trace log.
   * Optional: nodes may omit or truncate to reduce payload size.
   */
  hopTrace?: string[];
}
```

---

## 3. Message Types

```typescript
/**
 * Discriminated union of all valid Mirage packet types.
 */
type MiragePacketType =
  | 'DATA'          // Application-layer data (e.g., a text message)
  | 'HELLO'         // Peer discovery and routing table exchange
  | 'HEARTBEAT'     // Liveness probe; sent every 3 seconds to each neighbour
  | 'HEARTBEAT_ACK' // Acknowledgement of a HEARTBEAT; confirms liveness
  | 'ROUTE_UPDATE'  // Partial routing table advertisement to neighbours
  | 'EMERGENCY'     // Highest-priority broadcast; propagates to all known nodes
  | 'ACK'           // Application-layer acknowledgement of a DATA packet
  | 'LEAVE'         // Graceful node departure notification
  ;

/**
 * Payload union — each type has a distinct payload shape.
 */
type MessagePayload =
  | DataPayload
  | HelloPayload
  | HeartbeatPayload
  | HeartbeatAckPayload
  | RouteUpdatePayload
  | EmergencyPayload
  | AckPayload
  | LeavePayload
  ;

/** Payload for type = 'DATA' */
interface DataPayload {
  /** Human-readable message text. Max 4096 characters in MVP. */
  text: string;
  /** MIME type hint for future media support. Default: 'text/plain' */
  contentType: string;
}

/** Payload for type = 'HELLO' */
interface HelloPayload {
  /** Display name chosen by the user. */
  displayName: string;
  /** Snapshot of sender's routing table at time of HELLO. */
  routingTable: RoutingTableSnapshot;
  /** Protocol version for compatibility gating. */
  protocolVersion: string;
}

/** Payload for type = 'HEARTBEAT' */
interface HeartbeatPayload {
  /** Sequence number; incremented per heartbeat. Used to detect missed beats. */
  sequence: number;
  /** Current queue depth — number of packets in SCF queue. */
  queueDepth: number;
}

/** Payload for type = 'HEARTBEAT_ACK' */
interface HeartbeatAckPayload {
  /** Echo back the sequence number from the HEARTBEAT being acknowledged. */
  echoSequence: number;
}

/** Payload for type = 'ROUTE_UPDATE' */
interface RouteUpdatePayload {
  /** Partial routing table entries to share with neighbours. */
  routes: RoutingEntry[];
}

/** Payload for type = 'EMERGENCY' */
interface EmergencyPayload {
  /** Short human-readable emergency message. Max 512 characters. */
  text: string;
  /** Severity classification. */
  severity: 'info' | 'warning' | 'critical';
  /** Geographic hint (optional). */
  location?: { lat: number; lon: number };
}

/** Payload for type = 'ACK' */
interface AckPayload {
  /** The packetId being acknowledged. */
  ackedPacketId: string;
}

/** Payload for type = 'LEAVE' */
interface LeavePayload {
  /** Human-readable reason for departure. Optional. */
  reason?: string;
}
```

---

## 4. Priority Levels

```typescript
/**
 * Priority levels control forwarding order in the SCF queue.
 * Higher numeric values are forwarded first.
 */
enum PacketPriority {
  LOW = 0,       // Background sync, non-urgent data
  NORMAL = 1,    // Default for user-composed messages
  HIGH = 2,      // Time-sensitive messages flagged by user
  EMERGENCY = 3  // Reserved for EMERGENCY packet type; always forwarded first
}
```

### Priority Forwarding Rules

| Priority | Queue Position | Max SCF Retention |
|---|---|---|
| `EMERGENCY` | Head of queue | 30 minutes |
| `HIGH` | After EMERGENCY | 15 minutes |
| `NORMAL` | After HIGH | 5 minutes |
| `LOW` | Tail of queue | 2 minutes |

Packets exceeding their Max SCF Retention time are expired and removed from IndexedDB.

---

## 5. TTL Behaviour

```typescript
/**
 * TTL (Time-To-Live) controls the maximum hop distance a packet may travel.
 *
 * Rules:
 * 1. A new packet is created with TTL = DEFAULT_TTL.
 * 2. Every forwarding node (not the origin, not the destination) decrements TTL by 1.
 * 3. If TTL reaches 0 BEFORE the packet reaches its destination, the packet is DROPPED.
 * 4. Dropped packets are NOT queued; they are discarded permanently.
 * 5. EMERGENCY packets use TTL = MAX_TTL regardless of the user-specified value.
 * 6. HEARTBEAT and HEARTBEAT_ACK packets use TTL = 1 (direct neighbours only).
 */
interface TTLPolicy {
  readonly DEFAULT_TTL: 7;          // Sufficient for a 7-hop mesh
  readonly MAX_TTL: 15;             // Hard ceiling; prevents routing loops
  readonly HEARTBEAT_TTL: 1;        // Heartbeats do not traverse hops
  readonly EMERGENCY_TTL: 15;       // Emergency broadcasts use max TTL
  readonly HELLO_TTL: 1;            // HELLO is direct-neighbour only
  readonly ROUTE_UPDATE_TTL: 2;     // Route updates propagate 2 hops
}
```

---

## 6. Hop Count

```typescript
/**
 * hopCount is the number of hops traversed so far (origin = 0).
 *
 * Usage:
 * - The origin node sends a packet with hopCount = 0.
 * - Each forwarding node increments hopCount by 1 before forwarding.
 * - hopCount is used by receiving nodes to estimate distance to the origin.
 * - This distance estimate is stored in the routing table as `metric`.
 *
 * Maximum valid hopCount = MAX_TTL (15).
 * Packets where hopCount >= MAX_TTL are dropped to prevent loops.
 */
interface HopCountBehaviour {
  readonly INITIAL_HOP_COUNT: 0;
  readonly MAX_HOP_COUNT: 15;
}
```

---

## 7. Duplicate Detection

```typescript
/**
 * Every node maintains an in-memory duplicate detection cache.
 * This prevents a packet from being forwarded more than once by the same node.
 *
 * Cache structure: Set<packetId>
 *
 * Rules:
 * 1. On receiving a packet, check if packetId is in the cache.
 *    - If YES: DROP the packet immediately. Do not forward or process.
 *    - If NO: Add packetId to the cache. Process and forward normally.
 * 2. The cache is pruned every CACHE_PRUNE_INTERVAL to remove entries
 *    older than CACHE_TTL_MS. Entries track insertion timestamp.
 * 3. The cache is in-memory only; it is reset on page refresh.
 *    This is acceptable: old packets have TTL expiry.
 */
interface DuplicateCache {
  entries: Map<string, number>;          // packetId → insertedAt (ms)
  readonly CACHE_TTL_MS: 60_000;         // 1 minute; covers max packet lifetime
  readonly CACHE_PRUNE_INTERVAL: 30_000; // Prune every 30 seconds
}
```

---

## 8. Packet IDs

```typescript
/**
 * Packet IDs must be globally unique across the mesh.
 *
 * Format: `{originId}:{timestamp}:{uuid}`
 *
 * Examples:
 *   "node-a3f2:1717591234567:f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *
 * Construction rules:
 * - originId: The local node's persistent ID (stored in IndexedDB)
 * - timestamp: Date.now() at creation time (milliseconds)
 * - uuid: crypto.randomUUID() for collision avoidance within same millisecond
 *
 * The format is for human readability during debugging;
 * no parser should depend on the internal structure of a packetId.
 */
interface PacketIdSpec {
  readonly SEPARATOR: ':';
  readonly FORMAT: '{originId}:{timestamp}:{uuid}';
}
```

---

## 9. Routing Table Structure

```typescript
/**
 * Each node maintains a local routing table.
 * The table is a Map from destinationNodeId to the best known RoutingEntry.
 *
 * The routing algorithm is Distance Vector:
 * - Each node advertises its routing table to its direct neighbours in HELLO and ROUTE_UPDATE packets.
 * - Receiving nodes merge the advertised table with their own using the Bellman-Ford update rule:
 *     new_metric = received_metric + 1 (one additional hop through the advertising neighbour)
 *   If new_metric < existing_metric, update the entry.
 * - Split-horizon is NOT implemented in MVP to keep complexity low.
 *   Routing loops are mitigated by TTL and MAX_HOP_COUNT.
 */
interface RoutingTable {
  entries: Map<NodeId, RoutingEntry>;
}

type NodeId = string;

interface RoutingEntry {
  /** The final destination of this route. */
  destId: NodeId;

  /** 
   * The direct neighbour to forward packets to in order to reach destId.
   * If destId === nextHopId, the destination is a direct neighbour.
   */
  nextHopId: NodeId;

  /** 
   * Distance metric (hop count) to reach destId via nextHopId.
   * Lower is better.
   */
  metric: number;

  /** Unix timestamp (ms) when this entry was last updated. */
  lastUpdatedAt: number;

  /** 
   * How this entry was learned.
   * 'direct' = destId is a direct DataChannel neighbour.
   * 'advertised' = learned from a HELLO or ROUTE_UPDATE packet.
   */
  learnedFrom: 'direct' | 'advertised';
}

/**
 * Snapshot of a routing table, serialised into an array for transport in HELLO packets.
 */
type RoutingTableSnapshot = RoutingEntry[];
```

---

## 10. Heartbeat Format

```typescript
/**
 * Heartbeat lifecycle:
 * 1. Every HEARTBEAT_INTERVAL ms, each node sends a HEARTBEAT to each direct neighbour.
 * 2. The neighbour responds with a HEARTBEAT_ACK.
 * 3. If a node misses DEAD_THRESHOLD consecutive heartbeats from a neighbour,
 *    that neighbour is declared DEAD.
 * 4. On dead declaration:
 *    a. Remove all routing entries where nextHopId === dead neighbour.
 *    b. Emit 'peer-lost' event to Zustand store (triggers UI update).
 *    c. Trigger route recomputation.
 *    d. Scan SCF queue for packets now unroutable (they remain in queue, not dropped).
 */
interface HeartbeatPolicy {
  readonly HEARTBEAT_INTERVAL: 3_000;   // ms — send heartbeat every 3 seconds
  readonly DEAD_THRESHOLD: 3;           // miss 3 heartbeats → declare dead (9s)
  readonly ACK_TIMEOUT: 2_000;          // ms — wait up to 2s for HEARTBEAT_ACK
}

/**
 * Per-neighbour heartbeat state maintained by MeshEngine.
 */
interface NeighbourLivenessState {
  neighbourId: NodeId;
  lastHeartbeatSent: number;            // Unix ms
  lastAckReceived: number;              // Unix ms
  missedCount: number;                  // Consecutive missed ACKs
  status: 'alive' | 'suspect' | 'dead';
  outboundSequence: number;             // Increments each sent heartbeat
}
```

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
