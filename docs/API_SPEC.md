# MIRAGE — API Specification

> All REST endpoints and Socket.IO events for the Mirage signaling server.
> No implementation is provided; this document is a contract for Dev 1 (Backend) and Dev 2 (Frontend).

---

## Table of Contents

1. [Base URLs](#1-base-urls)
2. [REST Endpoints](#2-rest-endpoints)
3. [Socket.IO Events — Client → Server](#3-socketio-events--client--server)
4. [Socket.IO Events — Server → Client](#4-socketio-events--server--client)
5. [Error Codes](#5-error-codes)
6. [Connection Lifecycle](#6-connection-lifecycle)

---

## 1. Base URLs

| Environment | REST Base URL | Socket.IO URL |
|---|---|---|
| Local development | `http://localhost:3001/api` | `http://localhost:3001` |
| LAN demo (no internet) | `http://{LAN_IP}:3001/api` | `http://{LAN_IP}:3001` |

The LAN IP is shown at server startup. Clients must be configured with this IP.

---

## 2. REST Endpoints

### `GET /api/health`

**Purpose:** Liveness probe. Used by clients on startup to verify signaling server is reachable before attempting Socket.IO connection.

**Request:**
```
GET /api/health
```

No query parameters. No request body.

**Response — 200 OK:**
```typescript
interface HealthResponse {
  status: 'ok';
  serverTime: number;       // Unix ms
  connectedPeers: number;   // Count of currently connected sockets
  version: string;          // Server version string e.g. "1.0.0"
}
```

**Error cases:**
- `503 Service Unavailable` — server is starting up or shutting down

---

### `GET /api/nodes`

**Purpose:** Returns the list of currently-connected nodes. Used as a fallback peer discovery mechanism if the `peer-list` Socket.IO event is missed.

**Request:**
```
GET /api/nodes
```

No query parameters. No request body.

**Response — 200 OK:**
```typescript
interface NodesResponse {
  nodes: NodeSummary[];
  timestamp: number;          // Unix ms — when this snapshot was taken
}

interface NodeSummary {
  nodeId: string;             // Persistent node ID
  socketId: string;           // Ephemeral Socket.IO socket ID
  displayName: string;        // User-chosen display name
  connectedAt: number;        // Unix ms — when this socket connected
}
```

**Error cases:**
- `500 Internal Server Error` — registry read failure (should not happen)

---

### `GET /api/nodes/:nodeId`

**Purpose:** Look up a single node by its persistent node ID.

**Request:**
```
GET /api/nodes/node-a3f2
```

**Path parameter:**
- `nodeId` — the persistent node ID to look up

**Response — 200 OK:**
```typescript
interface SingleNodeResponse {
  node: NodeSummary;
}
```

**Error cases:**
- `404 Not Found` — node is not currently connected

---

## 3. Socket.IO Events — Client → Server

These are events the **browser client emits** to the signaling server.

---

### `join`

**Purpose:** Register the local node with the signaling server. Must be the first event emitted after socket connection.

**Emitted by:** Client, immediately on socket `connect` event.

**Payload:**
```typescript
interface JoinPayload {
  nodeId: string;         // Persistent node ID (from IndexedDB)
  displayName: string;    // User-chosen display name
  protocolVersion: string; // e.g. "1.0"
}
```

**Events emitted by server in response:**
- `peer-list` — sent to the joining client with all currently connected peers
- `new-peer` — broadcast to all existing connected clients

**Error cases:**
- If `nodeId` is already registered (same socket reconnecting), existing entry is updated, not duplicated.

---

### `offer`

**Purpose:** Forward an SDP Offer from the initiating peer to the target peer.

**Emitted by:** Initiating peer (the node that calls `createOffer()`).

**Payload:**
```typescript
interface OfferPayload {
  targetSocketId: string;     // Socket.IO ID of the target peer
  sdp: RTCSessionDescriptionInit;  // The SDP offer object
}
```

**Events emitted by server in response:**
- `offer` emitted to `targetSocketId` containing the SDP and the sender's socketId.

**Error cases:**
- If `targetSocketId` is not found: server emits `signaling-error` back to sender.

---

### `answer`

**Purpose:** Forward an SDP Answer from the responding peer to the initiating peer.

**Emitted by:** Responding peer (the node that calls `createAnswer()`).

**Payload:**
```typescript
interface AnswerPayload {
  targetSocketId: string;     // Socket.IO ID of the initiating peer
  sdp: RTCSessionDescriptionInit;  // The SDP answer object
}
```

**Events emitted by server in response:**
- `answer` emitted to `targetSocketId`.

**Error cases:**
- If `targetSocketId` is not found: server emits `signaling-error` back to sender.

---

### `ice-candidate`

**Purpose:** Forward a single ICE candidate from one peer to another (trickle ICE).

**Emitted by:** Either peer, as `onicecandidate` fires locally.

**Payload:**
```typescript
interface IceCandidatePayload {
  targetSocketId: string;          // Socket.IO ID of the target peer
  candidate: RTCIceCandidateInit;  // The ICE candidate
}
```

**Events emitted by server in response:**
- `ice-candidate` emitted to `targetSocketId`.

**Error cases:**
- If `targetSocketId` is not found: event is silently dropped (ICE candidates can be lost).

---

### `leave`

**Purpose:** Graceful disconnection. Notifies the server before the socket closes.

**Emitted by:** Client, on page unload (`beforeunload` event) or manual disconnect.

**Payload:**
```typescript
interface LeavePayload {
  nodeId: string;
  reason?: string;  // e.g. "user_closed_tab"
}
```

**Events emitted by server in response:**
- `peer-left` broadcast to all remaining connected clients.

**Error cases:**
- None. If `leave` is not received (e.g. crash), server detects socket disconnect via `disconnect` event and emits `peer-left` regardless.

---

## 4. Socket.IO Events — Server → Client

These are events the **signaling server emits** to browser clients.

---

### `peer-list`

**Purpose:** Sent to a newly-joined client with all existing connected peers. The client uses this to initiate WebRTC connections.

**Received by:** The client that just emitted `join`.

**Payload:**
```typescript
interface PeerListPayload {
  peers: NodeSummary[];   // All currently connected nodes (excluding self)
}
```

---

### `new-peer`

**Purpose:** Notifies all existing clients that a new peer has joined the network.

**Received by:** All connected clients except the one that just joined.

**Payload:**
```typescript
interface NewPeerPayload {
  peer: NodeSummary;      // The newly joined node
}
```

**Action expected from client:** Initiate a WebRTC connection to the new peer.

---

### `offer`

**Purpose:** Delivers an SDP offer forwarded from another peer.

**Received by:** The target peer specified in the original `offer` emit.

**Payload:**
```typescript
interface ForwardedOfferPayload {
  fromSocketId: string;                // Socket.IO ID of the initiating peer
  fromNodeId: string;                  // Persistent node ID of the initiating peer
  sdp: RTCSessionDescriptionInit;
}
```

---

### `answer`

**Purpose:** Delivers an SDP answer forwarded from the responding peer.

**Received by:** The initiating peer.

**Payload:**
```typescript
interface ForwardedAnswerPayload {
  fromSocketId: string;
  fromNodeId: string;
  sdp: RTCSessionDescriptionInit;
}
```

---

### `ice-candidate`

**Purpose:** Delivers an ICE candidate forwarded from another peer.

**Received by:** The target peer.

**Payload:**
```typescript
interface ForwardedIceCandidatePayload {
  fromSocketId: string;
  fromNodeId: string;
  candidate: RTCIceCandidateInit;
}
```

---

### `peer-left`

**Purpose:** Notifies all clients that a peer has disconnected (gracefully or via socket drop).

**Received by:** All connected clients.

**Payload:**
```typescript
interface PeerLeftPayload {
  nodeId: string;
  socketId: string;
  reason: 'graceful' | 'socket-disconnect' | 'timeout';
}
```

**Action expected from client:** 
- Close the corresponding RTCPeerConnection.
- Remove neighbour from routing table.
- Trigger route recomputation.
- Update Zustand store (triggers UI update).

---

### `signaling-error`

**Purpose:** Error notification for signaling-layer failures.

**Received by:** The client that caused the error.

**Payload:**
```typescript
interface SignalingErrorPayload {
  code: SignalingErrorCode;
  message: string;
  context?: Record<string, unknown>;  // Additional debugging context
}

type SignalingErrorCode =
  | 'TARGET_NOT_FOUND'     // targetSocketId not connected
  | 'INVALID_PAYLOAD'      // Malformed event payload
  | 'RATE_LIMITED'         // Too many events in short window (future)
  | 'PROTOCOL_VERSION'     // Incompatible protocol version
  ;
```

---

## 5. Error Codes

| HTTP Status | Meaning | When |
|---|---|---|
| `200` | OK | Successful request |
| `400` | Bad Request | Missing required fields |
| `404` | Not Found | Node ID not found in registry |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Server starting/stopping |

---

## 6. Connection Lifecycle

```
Client starts
    → GET /api/health           (verify server is reachable)
    → socket.connect()          (establish Socket.IO connection)
    → emit('join', ...)         (register node)
    → receive('peer-list', ...) (get existing peers)
    → [for each peer] initiate WebRTC handshake
    → WebRTC DataChannels open  (mesh established)
    
Normal operation
    → DataChannel traffic is P2P (server not involved)
    → receive('new-peer') → initiate new WebRTC connection
    → receive('peer-left') → clean up routing table

Client leaving
    → emit('leave', ...)        (graceful notification)
    → socket.disconnect()
```

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
