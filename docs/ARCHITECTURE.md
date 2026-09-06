# MIRAGE — System Architecture

> Complete technical architecture for the Mirage autonomous offline mesh network.

---

## Table of Contents

1. [High-Level System Diagram](#1-high-level-system-diagram)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [WebRTC Signaling Flow](#4-webrtc-signaling-flow)
5. [Peer Discovery Flow](#5-peer-discovery-flow)
6. [Packet Lifecycle](#6-packet-lifecycle)
7. [Store-Carry-Forward Workflow](#7-store-carry-forward-workflow)
8. [Node Failure & Rerouting Workflow](#8-node-failure--rerouting-workflow)

---

## 1. High-Level System Diagram

```mermaid
graph TB
    subgraph "LAN / Local Network"
        subgraph "Node A — Browser"
            A_APP["Next.js App"]
            A_MESH["MeshEngine"]
            A_RTC["RTCManager"]
            A_DB["IndexedDB"]
            A_VIZ["TopologyViz"]
        end

        subgraph "Node B — Browser"
            B_APP["Next.js App"]
            B_MESH["MeshEngine"]
            B_RTC["RTCManager"]
            B_DB["IndexedDB"]
        end

        subgraph "Node C — Browser"
            C_APP["Next.js App"]
            C_MESH["MeshEngine"]
            C_RTC["RTCManager"]
            C_DB["IndexedDB"]
        end

        SIG["Signaling Server\nExpress + Socket.IO\n:3001"]
    end

    A_RTC <-->|"WebRTC DataChannel (mesh edge)"| B_RTC
    B_RTC <-->|"WebRTC DataChannel (mesh edge)"| C_RTC
    A_RTC <-->|"WebRTC DataChannel (mesh edge)"| C_RTC

    A_APP -->|"ICE/SDP via Socket.IO"| SIG
    B_APP -->|"ICE/SDP via Socket.IO"| SIG
    C_APP -->|"ICE/SDP via Socket.IO"| SIG
    SIG -->|"relay signaling only"| A_APP
    SIG -->|"relay signaling only"| B_APP
    SIG -->|"relay signaling only"| C_APP

    A_MESH --- A_RTC
    A_MESH --- A_DB
    A_MESH --- A_VIZ

    style SIG fill:#f6a623,color:#000
    style A_MESH fill:#4a90d9,color:#fff
    style B_MESH fill:#4a90d9,color:#fff
    style C_MESH fill:#4a90d9,color:#fff
```

**Key principle:** The signaling server is used only to bootstrap WebRTC connections. Once DataChannels are open, all traffic is peer-to-peer. Removing the signaling server does not break existing mesh connections.

---

## 2. Frontend Architecture

### 2.1 Layer Diagram

```mermaid
graph TD
    UI["UI Layer\n(React Components)"]
    STORE["State Layer\n(Zustand Stores)"]
    ENGINE["Protocol Layer\n(MeshEngine)"]
    RTC["Transport Layer\n(RTCManager)"]
    IDB["Persistence Layer\n(IndexedDB via idb)"]

    UI --> STORE
    STORE --> ENGINE
    ENGINE --> RTC
    ENGINE --> IDB
    RTC -->|"Incoming packets"| ENGINE
```

### 2.2 Component Tree

```
<App>
├── <TopologyPage>
│   ├── <TopologyCanvas>      — React Flow graph; nodes = peers; edges = DataChannels
│   ├── <NodeInfoPanel>       — Selected node metadata (hops, last seen, queue depth)
│   └── <PacketTraceLog>      — Live packet trace (scrollable)
├── <MessengerPanel>
│   ├── <NodeSelector>        — Pick destination peer
│   ├── <MessageComposer>     — Text input + priority selector
│   └── <MessageThread>       — Delivered messages per peer
├── <NetworkStatusBar>        — Connected peers count, queue depth, local node ID
└── <SettingsModal>           — Node display name, signaling server URL
```

### 2.3 Zustand Store Slices

| Store | Responsibility |
|---|---|
| `useMeshStore` | Connected peers, routing table, own node identity |
| `usePacketStore` | Packet queue, delivered packets, packet trace log |
| `useTopologyStore` | React Flow nodes/edges derived from peer list |
| `useUIStore` | Selected node, panel states, modal visibility |

### 2.4 MeshEngine (Core)

The `MeshEngine` is a singleton class (not a React component). It is instantiated once on page load and persists for the lifetime of the browser session.

Responsibilities:
- Orchestrate RTCManager to connect/disconnect peers
- Receive raw DataChannel messages and parse them as MiragePackets
- Implement routing logic (next-hop lookup)
- Push packets to IndexedDB queue when route is unavailable
- Emit events to Zustand stores for UI updates
- Send periodic heartbeat packets

---

## 3. Backend Architecture

The backend is intentionally minimal. It serves two purposes:
1. **Signaling relay** — forward ICE candidates and SDP offers/answers between peers
2. **Peer registry** — maintain a list of currently-online socket IDs so new nodes know who to connect to

```mermaid
graph LR
    subgraph "Express Server :3001"
        HTTP["HTTP\n/api/nodes\n/api/health"]
        SIO["Socket.IO\n/signal namespace"]
        REGISTRY["In-Memory\nPeer Registry"]
    end

    HTTP --> REGISTRY
    SIO --> REGISTRY
```

### 3.1 Server Modules

| Module | File | Purpose |
|---|---|---|
| `app.ts` | `apps/server/src/app.ts` | Express app, CORS, health route |
| `signaling.ts` | `apps/server/src/signaling.ts` | Socket.IO handlers: join, offer, answer, ice-candidate, leave |
| `registry.ts` | `apps/server/src/registry.ts` | In-memory `Map<socketId, NodeInfo>` |

### 3.2 State

The server is **stateless with respect to packets**. It never sees application data. It only relays WebRTC handshake messages. All packet routing occurs in browser.

---

## 4. WebRTC Signaling Flow

```mermaid
sequenceDiagram
    participant A as Node A (Initiator)
    participant S as Signaling Server
    participant B as Node B (Responder)

    A->>S: socket.emit('join', { nodeId, displayName })
    S->>A: emit('peer-list', [{ nodeId: B_id, socketId: B_sock }])
    S->>B: emit('new-peer', { nodeId: A_id, socketId: A_sock })

    Note over A: createOffer() → SDP Offer
    A->>S: emit('offer', { targetSocketId: B_sock, sdp })
    S->>B: emit('offer', { fromSocketId: A_sock, sdp })

    Note over B: setRemoteDescription(offer)\ncreateAnswer() → SDP Answer
    B->>S: emit('answer', { targetSocketId: A_sock, sdp })
    S->>A: emit('answer', { fromSocketId: B_sock, sdp })

    Note over A,B: ICE Candidate exchange (trickle ICE)
    A->>S: emit('ice-candidate', { targetSocketId: B_sock, candidate })
    S->>B: emit('ice-candidate', { fromSocketId: A_sock, candidate })
    B->>S: emit('ice-candidate', { targetSocketId: A_sock, candidate })
    S->>A: emit('ice-candidate', { fromSocketId: B_sock, candidate })

    Note over A,B: RTCDataChannel opens\nAll further communication is P2P
    A-->>B: DataChannel message (MiragePacket)
    B-->>A: DataChannel message (MiragePacket)
```

---

## 5. Peer Discovery Flow

```mermaid
flowchart TD
    START([Browser opens Mirage]) --> RESTORE[Restore local NodeID from IndexedDB]
    RESTORE --> CONNECT_SIG[Connect to Signaling Server via Socket.IO]
    CONNECT_SIG --> JOIN[emit 'join' with NodeID + DisplayName]
    JOIN --> RECEIVE_LIST[Receive peer-list from server]
    RECEIVE_LIST --> FOR_EACH{For each peer\nin list}
    FOR_EACH --> INITIATE[Initiate WebRTC handshake\ncreateOffer]
    INITIATE --> EXCHANGE[Exchange SDP + ICE\nvia signaling server]
    EXCHANGE --> OPEN[DataChannel.onopen fires]
    OPEN --> SEND_HELLO[Send HELLO packet\nwith routing table snapshot]
    SEND_HELLO --> MERGE[Merge peer's routing table\ninto own table]
    MERGE --> UPDATE_UI[Update Zustand → React Flow renders edge]
    FOR_EACH --> DONE([Mesh edge established])

    RECEIVE_LIST --> LISTEN_NEW[Listen for 'new-peer' events]
    LISTEN_NEW --> INITIATE
```

---

## 6. Packet Lifecycle

```mermaid
flowchart TD
    COMPOSE([User composes message]) --> CREATE[Create MiragePacket\nwith new packetId + timestamp]
    CREATE --> LOCAL_DUPE[Check duplicate cache\nfor packetId]
    LOCAL_DUPE -- Already seen --> DROP_LOCAL([Drop — already delivered])
    LOCAL_DUPE -- New --> ADD_DUPE[Add to duplicate cache]
    ADD_DUPE --> LOOKUP_ROUTE{Route to destination\nin routing table?}

    LOOKUP_ROUTE -- Yes: route exists --> GET_NEXTHOP[Get next-hop neighbour]
    LOOKUP_ROUTE -- No: no route --> SCF_QUEUE[Store in IndexedDB SCF Queue]
    SCF_QUEUE --> WAIT([Wait for new neighbour])

    GET_NEXTHOP --> TTL_CHECK{TTL > 0?}
    TTL_CHECK -- No --> DROP_TTL([Drop — TTL expired])
    TTL_CHECK -- Yes --> DECREMENT[Decrement TTL\nIncrement hopCount]
    DECREMENT --> SEND[Send via DataChannel\nto next-hop peer]

    SEND --> RECEIVE([Receiving Node])
    RECEIVE --> PARSE[Parse MiragePacket]
    PARSE --> DUPE_CHECK{Seen this packetId?}
    DUPE_CHECK -- Yes --> DROP_DUPE([Drop — duplicate])
    DUPE_CHECK -- No --> DEST_CHECK{Am I the\ndestination?}
    DEST_CHECK -- Yes --> DELIVER([Deliver to application layer])
    DEST_CHECK -- No --> LOOKUP_ROUTE
```

---

## 7. Store-Carry-Forward Workflow

```mermaid
flowchart TD
    PKT([Packet to route]) --> ROUTE_LOOKUP{Route available\nfor destination?}
    ROUTE_LOOKUP -- Yes --> FORWARD([Forward immediately])
    ROUTE_LOOKUP -- No --> ENQUEUE[Write to IndexedDB\nscf_queue table\nwith timestamp + priority]

    ENQUEUE --> MONITOR[Monitor for topology changes]
    MONITOR --> NEW_PEER{New neighbour\nconnected?}
    NEW_PEER -- No --> WAIT([Wait])
    NEW_PEER -- Yes --> HELLO[Receive HELLO from new peer\nwith their routing table]
    HELLO --> RECOMPUTE[Recompute own routing table]
    RECOMPUTE --> SCAN_QUEUE[Scan scf_queue for\nnow-routable packets]
    SCAN_QUEUE --> FOUND{Found routable\npackets?}
    FOUND -- No --> MONITOR
    FOUND -- Yes --> DEQUEUE[Dequeue highest priority first]
    DEQUEUE --> FORWARD_QUEUED([Forward packet — mark delivered])
    FORWARD_QUEUED --> SCAN_QUEUE
```

---

## 8. Node Failure & Rerouting Workflow

```mermaid
sequenceDiagram
    participant A as Node A
    participant B as Node B (failing)
    participant C as Node C

    Note over A,C: Normal operation — A routes to C via B
    A->>B: MiragePacket (destId=C)
    B->>C: MiragePacket (forwarded)

    Note over B: Network cable unplugged / tab closed
    loop Every 3 seconds
        A->>B: HEARTBEAT packet
        B--xA: No response (timeout after 3 missed heartbeats = 9s)
    end

    Note over A: 3 heartbeats missed → mark B as DEAD\nRemove B from routing table\nEmit 'peer-lost' event
    A->>A: Recalculate routes\n(B removed from table)
    A->>C: Attempt direct DataChannel\n(if ICE connection still alive)
    C->>A: HELLO packet\n(routing table update)

    Note over A,C: Direct link established\nTopology updated in React Flow
    A->>C: MiragePacket (direct, no intermediate hop)
    Note over A: Drain SCF queue for C\n(if any packets were queued)
```

### Failure Detection Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Heartbeat interval | 3 seconds | Low overhead; fast enough for demo |
| Dead threshold | 3 missed heartbeats | 9 seconds to detect failure |
| Route recomputation | Immediate on dead detection | Distance Vector; local only |
| SCF drain delay | 1 second after route available | Allow topology to stabilise |

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
