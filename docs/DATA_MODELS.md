# MIRAGE — Data Models

> Complete TypeScript interface definitions for all shared types in the Mirage system.
> These types are the canonical source of truth. All modules (frontend and backend) import from `packages/shared/src/types/`.
> No implementation is provided.

---

## Table of Contents

1. [Node](#1-node)
2. [Packet](#2-packet) — see [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md)
3. [Neighbour](#3-neighbour)
4. [Route & RoutingTable](#4-route--routingtable)
5. [QueueEntry](#5-queueentry)
6. [EmergencyMarker](#6-emergencymarker)
7. [SignalingModels](#7-signalingmodels)
8. [UIModels](#8-uimodels)
9. [PersistenceModels](#9-persistencemodels)
10. [Enums & Constants](#10-enums--constants)

---

## 1. Node

```typescript
/**
 * Represents a single device participating in the Mirage mesh network.
 * This is the canonical identity object stored in IndexedDB and shared
 * in HELLO packets.
 */
interface MirageNode {
  /** 
   * Persistent unique identifier. 
   * Generated once on first page load; stored in IndexedDB.
   * Format: "node-{8-char-random-hex}"
   * Example: "node-a3f2c891"
   */
  nodeId: string;

  /**
   * Human-readable name chosen by the user at setup.
   * Displayed in the topology visualisation.
   * Max 32 characters.
   */
  displayName: string;

  /**
   * Unix timestamp (ms) when this node identity was first created.
   * Stored in IndexedDB alongside nodeId.
   */
  createdAt: number;

  /**
   * Unix timestamp (ms) of the most recent activity from this node.
   * Updated on every received heartbeat.
   */
  lastSeenAt: number;

  /**
   * The socket ID of this node's current connection to the signaling server.
   * Ephemeral; changes on every page refresh.
   * null if this node is not currently connected to the signaling server.
   */
  socketId: string | null;

  /**
   * Current operational status of this node from our perspective.
   * 'self'    = this is our own node
   * 'alive'   = receiving heartbeats normally
   * 'suspect' = 1–2 missed heartbeats; may be slow
   * 'dead'    = 3+ missed heartbeats; removed from routing table
   */
  status: 'self' | 'alive' | 'suspect' | 'dead';

  /**
   * Number of packets currently in this node's SCF queue.
   * Received via heartbeat payload. Used for UI display.
   * null if unknown (e.g., old protocol peer).
   */
  queueDepth: number | null;

  /**
   * Protocol version string of this node.
   * Used for compatibility checking.
   */
  protocolVersion: string;
}

/**
 * Lightweight summary used in REST API responses and peer-list events.
 * Does not include routing or queue state.
 */
interface NodeSummary {
  nodeId: string;
  socketId: string;
  displayName: string;
  connectedAt: number;
}
```

---

## 2. Packet

Packet types are fully specified in [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md).

```typescript
// Re-exported from PROTOCOL_SPEC for convenience.
// The canonical definitions live in packages/shared/src/types/packet.ts

export type {
  MiragePacket,
  MiragePacketType,
  MessagePayload,
  DataPayload,
  HelloPayload,
  HeartbeatPayload,
  HeartbeatAckPayload,
  RouteUpdatePayload,
  EmergencyPayload,
  AckPayload,
  LeavePayload,
  PacketPriority,
} from './packet';
```

---

## 3. Neighbour

```typescript
/**
 * Represents a direct WebRTC DataChannel connection to a peer.
 * A Neighbour is a node that is ONE hop away — directly connected.
 *
 * Distinguished from MirageNode: a node can be known (in routing table)
 * without being a direct neighbour.
 */
interface Neighbour {
  /** The node ID of the directly connected peer. */
  nodeId: string;

  /** Display name (received via HELLO packet). */
  displayName: string;

  /** 
   * Reference label for the WebRTC connection.
   * Used internally by RTCManager to look up the PeerConnection.
   * Not serialisable; internal use only.
   */
  connectionLabel: string;

  /** 
   * The state of the underlying RTCDataChannel.
   * Mirrors RTCDataChannel.readyState.
   */
  channelState: 'connecting' | 'open' | 'closing' | 'closed';

  /** Unix timestamp (ms) when this DataChannel opened. */
  connectedAt: number;

  /** Current liveness status based on heartbeat tracking. */
  livenessStatus: 'alive' | 'suspect' | 'dead';

  /** Number of consecutive missed heartbeat ACKs. */
  missedHeartbeats: number;

  /** 
   * Approximate round-trip latency in milliseconds.
   * Calculated from heartbeat send time and ACK receive time.
   * null if not yet measured.
   */
  latencyMs: number | null;

  /** 
   * Signal quality estimation (derived from latency and missed heartbeats).
   * Used for routing metric tie-breaking.
   */
  signalQuality: 'excellent' | 'good' | 'fair' | 'poor';
}
```

---

## 4. Route & RoutingTable

```typescript
/**
 * A single entry in the node's routing table.
 * Specifies how to reach a specific destination node.
 */
interface RoutingEntry {
  /** Destination node ID. */
  destId: string;

  /** 
   * Next-hop node ID. 
   * Must be a current direct Neighbour.
   * If destId === nextHopId, the destination is directly connected.
   */
  nextHopId: string;

  /** 
   * Hop count (distance metric) to reach destId via nextHopId.
   * 1 = direct neighbour.
   * n = n hops away.
   */
  metric: number;

  /** Unix timestamp (ms) when this entry was last updated or confirmed. */
  lastUpdatedAt: number;

  /**
   * Whether this route is currently usable.
   * false if nextHopId has been marked dead.
   */
  isActive: boolean;

  /**
   * How this route was learned.
   * 'direct'     = destId is a direct DataChannel neighbour.
   * 'advertised' = learned from a HELLO or ROUTE_UPDATE from another node.
   */
  learnedFrom: 'direct' | 'advertised';

  /**
   * The node ID that advertised this route to us.
   * Equal to nextHopId for most routes.
   * null for 'direct' routes.
   */
  advertisedBy: string | null;
}

/**
 * The complete routing table for a node.
 * Implemented as a Map for O(1) lookup by destId.
 */
interface RoutingTable {
  /** Map from destId → best known RoutingEntry for that destination. */
  entries: Map<string, RoutingEntry>;

  /** Unix timestamp (ms) when the table was last modified. */
  lastModifiedAt: number;

  /** 
   * Version counter. Incremented on any modification.
   * Used to detect stale snapshots during HELLO exchange.
   */
  version: number;
}

/**
 * Serialisable snapshot of a routing table for transport in HELLO packets.
 * Maps and other non-JSON types are converted to arrays.
 */
type RoutingTableSnapshot = RoutingEntry[];
```

---

## 5. QueueEntry

```typescript
/**
 * An entry in the Store-Carry-Forward (SCF) queue.
 * Persisted to IndexedDB in the 'scf_queue' object store.
 *
 * Object store key: queueId (auto-incremented integer)
 * Indexes:
 *   - destId (for lookup during route scan)
 *   - priority DESC + enqueuedAt ASC (for dequeue order)
 *   - expiresAt (for TTL expiry pruning)
 */
interface QueueEntry {
  /** Auto-incremented primary key in IndexedDB. */
  queueId?: number;

  /** The full MiragePacket to be forwarded when a route becomes available. */
  packet: MiragePacket;

  /** Destination node ID — denormalised for indexed lookups. */
  destId: string;

  /** Packet priority — denormalised for sorted dequeue. */
  priority: PacketPriority;

  /** Unix timestamp (ms) when this entry was added to the queue. */
  enqueuedAt: number;

  /** Unix timestamp (ms) after which this entry should be expired and dropped. */
  expiresAt: number;

  /** 
   * Number of forward attempts made for this packet.
   * Incremented each time a route was found but the send failed.
   * Not incremented for normal SCF waiting (no route).
   */
  attemptCount: number;

  /** 
   * Status of this queue entry.
   * 'pending'   = waiting for a route
   * 'sending'   = currently being forwarded
   * 'delivered' = successfully sent (will be removed from DB shortly)
   * 'expired'   = TTL exceeded; will be removed from DB
   * 'failed'    = max attempts exceeded
   */
  status: 'pending' | 'sending' | 'delivered' | 'expired' | 'failed';
}
```

---

## 6. EmergencyMarker

```typescript
/**
 * Represents an emergency event in the system.
 * Created when an EMERGENCY packet is received and delivered.
 * Displayed in the topology visualisation as a special marker.
 * Persisted to IndexedDB for display after page refresh.
 *
 * Object store: 'emergency_markers'
 * Key: markerId
 */
interface EmergencyMarker {
  /** Unique ID — derived from the originating packet's packetId. */
  markerId: string;

  /** Node ID of the node that originated the emergency. */
  originNodeId: string;

  /** Display name of the origin node (at time of emission). */
  originDisplayName: string;

  /** The emergency message text. */
  text: string;

  /** Severity level from the EMERGENCY packet payload. */
  severity: 'info' | 'warning' | 'critical';

  /** Optional geographic coordinates from the packet payload. */
  location?: {
    lat: number;
    lon: number;
  };

  /** Unix timestamp (ms) when the emergency was originally created. */
  createdAt: number;

  /** Unix timestamp (ms) when this marker was received by the local node. */
  receivedAt: number;

  /** Number of hops the emergency packet had traversed when received. */
  hopCountAtReceipt: number;

  /** Whether this marker has been acknowledged by the local user. */
  acknowledged: boolean;
}
```

---

## 7. SignalingModels

```typescript
/**
 * Internal registry entry stored on the signaling server (in memory).
 * One entry per connected socket.
 */
interface RegistryEntry {
  nodeId: string;
  socketId: string;
  displayName: string;
  protocolVersion: string;
  connectedAt: number;
  lastActivityAt: number;
}

/**
 * Signaling server configuration.
 */
interface ServerConfig {
  port: number;
  corsOrigins: string[];
  maxPeers: number;           // Safety limit; default 50 for demo
  heartbeatTimeoutMs: number; // Socket.IO ping timeout
}
```

---

## 8. UIModels

```typescript
/**
 * React Flow node data. 
 * Passed as the `data` prop to custom React Flow node components.
 */
interface TopologyNodeData {
  nodeId: string;
  displayName: string;
  status: MirageNode['status'];
  isLocalNode: boolean;
  queueDepth: number;
  latencyMs: number | null;
  signalQuality: Neighbour['signalQuality'] | null;
}

/**
 * React Flow edge data.
 * Passed as the `data` prop to custom React Flow edge components.
 */
interface TopologyEdgeData {
  fromNodeId: string;
  toNodeId: string;
  latencyMs: number | null;
  isActive: boolean;
  packetCount: number;    // Packets forwarded on this edge (session total)
}

/**
 * Entry in the packet trace log displayed in the UI.
 * Shows how a specific packet traversed the mesh.
 */
interface PacketTraceEntry {
  packetId: string;
  type: MiragePacketType;
  originId: string;
  destId: string;
  hopTrace: string[];
  deliveredAt: number | null;   // null if not yet delivered
  status: 'in-flight' | 'delivered' | 'queued' | 'dropped';
}

/**
 * A single message in the messaging UI (messenger panel).
 */
interface UIMessage {
  packetId: string;
  fromNodeId: string;
  fromDisplayName: string;
  toNodeId: string;
  text: string;
  sentAt: number;
  receivedAt: number | null;
  status: 'sending' | 'sent' | 'delivered' | 'queued' | 'failed';
  hopCount: number | null;
}
```

---

## 9. PersistenceModels

```typescript
/**
 * IndexedDB schema for the Mirage application.
 *
 * Database name: 'mirage-db'
 * Version: 1
 *
 * Object Stores:
 */

/** 'node_identity' — stores the local node's persistent identity. Key: 'local' (singleton). */
interface StoredNodeIdentity {
  key: 'local';
  nodeId: string;
  displayName: string;
  createdAt: number;
  protocolVersion: string;
}

/** 'scf_queue' — SCF packet queue. See QueueEntry above. */
// Uses QueueEntry interface with auto-incremented queueId key.

/** 'delivered_packets' — recently delivered DATA packets for message history. */
interface StoredDeliveredPacket {
  packetId: string;    // Primary key
  packet: MiragePacket;
  deliveredAt: number;
  direction: 'inbound' | 'outbound';
}

/** 'emergency_markers' — emergency events. See EmergencyMarker above. */
// Uses EmergencyMarker interface with markerId as key.

/** 'settings' — user preferences. Key: 'app' (singleton). */
interface StoredSettings {
  key: 'app';
  signalingServerUrl: string;
  displayName: string;
  defaultPriority: PacketPriority;
  showHopTrace: boolean;
}
```

---

## 10. Enums & Constants

```typescript
/**
 * Protocol-level constants shared across all modules.
 * Centralised here to prevent magic numbers.
 */
const MIRAGE_CONSTANTS = {
  // Packet
  DEFAULT_TTL: 7,
  MAX_TTL: 15,
  HEARTBEAT_TTL: 1,
  EMERGENCY_TTL: 15,
  HELLO_TTL: 1,
  ROUTE_UPDATE_TTL: 2,
  INITIAL_HOP_COUNT: 0,
  MAX_HOP_COUNT: 15,

  // Heartbeat
  HEARTBEAT_INTERVAL_MS: 3_000,
  DEAD_THRESHOLD: 3,
  ACK_TIMEOUT_MS: 2_000,

  // SCF Queue TTL (milliseconds)
  SCF_TTL_EMERGENCY_MS: 30 * 60 * 1_000,  // 30 minutes
  SCF_TTL_HIGH_MS: 15 * 60 * 1_000,       // 15 minutes
  SCF_TTL_NORMAL_MS: 5 * 60 * 1_000,      // 5 minutes
  SCF_TTL_LOW_MS: 2 * 60 * 1_000,         // 2 minutes

  // Duplicate cache
  CACHE_TTL_MS: 60_000,
  CACHE_PRUNE_INTERVAL_MS: 30_000,

  // Broadcast
  BROADCAST_ADDRESS: '*' as const,

  // Limits
  MAX_DISPLAY_NAME_LENGTH: 32,
  MAX_DATA_PAYLOAD_LENGTH: 4_096,
  MAX_EMERGENCY_TEXT_LENGTH: 512,
  MAX_HOP_TRACE_LENGTH: 16,

  // Server
  DEFAULT_SERVER_PORT: 3001,
  MAX_PEERS: 50,

  // Protocol
  PROTOCOL_VERSION: '1.0',
} as const;

/** Node ID generation prefix. */
const NODE_ID_PREFIX = 'node-' as const;

/** IndexedDB database name and version. */
const IDB_CONFIG = {
  DB_NAME: 'mirage-db',
  DB_VERSION: 1,
} as const;
```

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
