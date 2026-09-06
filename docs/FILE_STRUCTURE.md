# MIRAGE — Repository File Structure

> Complete monorepo layout with ownership annotations.
> Every folder is explained. Every file's purpose is documented.

---

## Table of Contents

1. [Top-Level Layout](#1-top-level-layout)
2. [apps/web — Frontend](#2-appsweb--frontend)
3. [apps/server — Signaling Backend](#3-appsserver--signaling-backend)
4. [packages/shared — Shared Types & Constants](#4-packagesshared--shared-types--constants)
5. [docs — Engineering Documentation](#5-docs--engineering-documentation)
6. [Ownership Map](#6-ownership-map)

---

## 1. Top-Level Layout

```
mirage/
├── apps/
│   ├── web/              ← Next.js frontend (Dev 2, Dev 3, Dev 4)
│   └── server/           ← Express signaling server (Dev 1)
│
├── packages/
│   └── shared/           ← Shared TypeScript types and constants (Dev 1 seeds; all consume)
│
├── docs/                 ← All engineering documentation (no code)
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── PROTOCOL_SPEC.md
│   ├── API_SPEC.md
│   ├── DATA_MODELS.md
│   ├── FILE_STRUCTURE.md     ← This file
│   ├── IMPLEMENTATION_PLAN.md
│   ├── TEAM_ASSIGNMENT.md
│   ├── RISK_REGISTER.md
│   └── DEMO_SCRIPT.md
│
├── progress.d            ← Live progress tracker; updated by all team members
├── .gitignore
├── turbo.json            ← Turborepo pipeline config
├── package.json          ← Root workspace package.json
└── README.md
```

**Why a monorepo?**
The `shared` package is imported by both `apps/web` and `apps/server`. A monorepo (Turborepo) ensures type safety across the boundary with zero duplication and makes `tsc` type checking work across the workspace.

---

## 2. frontend — React Native / Expo App

> **Platform:** React Native (Expo SDK 57). Runs on iOS, Android, and Web via `expo start`.
> **Changed from original spec:** Original docs specified Next.js + React Flow web app. Decision was made to use React Native for cross-platform mobile-first experience. All engine and signaling code is identical.

```
frontend/
├── App.tsx                         ← Root entry; mounts useMeshEngine() to boot the mesh
├── index.ts                        ← Expo entry point
├── app.json                        ← Expo config (name, bundleId, etc.)
├── package.json
├── tsconfig.json
│
└── src/
    ├── engine/                     ← Protocol layer (NO React — pure TypeScript)
    │   ├── MeshEngine.ts           ← Main orchestrator singleton (Dev 5)
    │   ├── RTCManager.ts           ← WebRTC peer connections + DataChannels (Dev 5)
    │   ├── PacketRouter.ts         ← Bellman-Ford routing table + next-hop (Dev 5)
    │   ├── PacketBuilder.ts        ← Constructs all 8 MiragePacket types (Dev 5)
    │   ├── DuplicateCache.ts       ← 5-min TTL seen-packet cache (Dev 5)
    │   ├── HeartbeatManager.ts     ← 3s heartbeat; dead-peer detection (Dev 5)
    │   ├── SCFQueue.ts             ← Priority store-carry-forward queue (Dev 5)
    │   └── types.ts                ← All engine-local TypeScript types (Dev 5)
    │
    ├── stores/                     ← Zustand state stores (Dev 3)
    │   ├── useMeshStore.ts         ← Peers, routing table, local identity, connection status
    │   ├── usePacketStore.ts       ← Delivered messages, SCF queue, trace log
    │   └── useEmergencyStore.ts    ← Emergency markers + acknowledgement state
    │
    ├── hooks/                      ← React hooks bridging engine → UI (Dev 3)
    │   ├── useMeshEngine.ts        ← Boots engine on mount; wires all engine events to stores
    │   ├── useEmergency.ts         ← Emergency state + broadcastEmergency action
    │   └── usePeerMessages.ts      ← Per-peer message thread + send action
    │
    ├── lib/                        ← Signaling client + identity (Dev 2)
    │   ├── signaling.ts            ← Socket.IO client; full SignalingClient interface
    │   ├── nodeId.ts               ← Persistent node ID via AsyncStorage
    │   └── constants.ts            ← SIGNALING_URL, timing constants
    │
    ├── screens/                    ← Full-screen views (Dev 4)
    │   ├── HomeScreen.tsx          ← SOS button; live peer count; real emergency broadcast
    │   ├── ChatScreen.tsx          ← Per-peer message thread; real engine send/receive
    │   ├── MessagesListScreen.tsx  ← Live peer list from useMeshStore; last messages
    │   └── ProfileScreen.tsx       ← Node identity and settings
    │
    ├── components/                 ← Reusable UI components (Dev 4)
    │   ├── SosButton.tsx           ← Animated ripple SOS button
    │   ├── AddressCard.tsx         ← Address display card
    │   ├── ChatBubble.tsx          ← Message bubble with hop trace info
    │   ├── MessageComposer.tsx     ← Text input + priority picker + send
    │   └── BottomNav.tsx           ← Tab bar navigation
    │
    ├── types/
    │   └── index.ts                ← Shared UI types (ChatMessage, ScreenType, etc.)
    │
    └── theme/
        └── colors.ts               ← Design token palette
```

### Module Ownership — frontend

| Folder | Owner | Notes |
|---|---|---|
| `engine/` | Dev 5 | Core protocol; no React dependencies |
| `stores/` | Dev 3 | All Zustand stores |
| `hooks/` | Dev 3 | React hooks bridging engine to UI |
| `lib/` | Dev 2 | Signaling client, node ID utility |
| `screens/` | Dev 4 | Full-screen views |
| `components/` | Dev 4 | Reusable UI components |

```
apps/web/
├── src/
│   ├── app/                            ← Next.js App Router pages
│   │   ├── layout.tsx                  ← Root layout; font setup, global providers
│   │   ├── page.tsx                    ← Entry point; redirects to /topology
│   │   ├── topology/
│   │   │   └── page.tsx                ← Main topology visualisation page
│   │   ├── messenger/
│   │   │   └── page.tsx                ← Messenger panel (demo of protocol)
│   │   └── settings/
│   │       └── page.tsx                ← Node settings (display name, server URL)
│   │
│   ├── components/
│   │   ├── topology/
│   │   │   ├── TopologyCanvas.tsx      ← React Flow canvas; renders mesh graph
│   │   │   ├── MeshNode.tsx            ← Custom React Flow node component
│   │   │   ├── MeshEdge.tsx            ← Custom React Flow edge component
│   │   │   ├── NodeInfoPanel.tsx       ← Sidebar: selected node details
│   │   │   └── PacketTraceLog.tsx      ← Scrollable list of packet hop traces
│   │   │
│   │   ├── messenger/
│   │   │   ├── NodeSelector.tsx        ← Dropdown: choose destination peer
│   │   │   ├── MessageComposer.tsx     ← Text input + priority picker + send button
│   │   │   └── MessageThread.tsx       ← Delivered messages per peer
│   │   │
│   │   ├── emergency/
│   │   │   ├── EmergencyBanner.tsx     ← Top-of-screen alert for EMERGENCY packets
│   │   │   └── EmergencyButton.tsx     ← One-click emergency broadcast trigger
│   │   │
│   │   └── shared/
│   │       ├── NetworkStatusBar.tsx    ← Top bar: peer count, queue depth, node ID
│   │       ├── SettingsModal.tsx       ← Inline settings overlay
│   │       └── QueueDepthBadge.tsx     ← Visual indicator of SCF queue size
│   │
│   ├── engine/                         ← Protocol layer (NOT React)
│   │   ├── MeshEngine.ts               ← Main orchestrator (Dev 5)
│   │   ├── RTCManager.ts               ← WebRTC peer connection management (Dev 5)
│   │   ├── PacketRouter.ts             ← Routing table + next-hop logic (Dev 5)
│   │   ├── PacketBuilder.ts            ← Constructs MiragePacket objects (Dev 5)
│   │   ├── DuplicateCache.ts           ← In-memory seen-packet cache (Dev 5)
│   │   ├── HeartbeatManager.ts         ← Sends/receives heartbeats (Dev 5)
│   │   └── SCFQueue.ts                 ← Store-Carry-Forward queue interface (Dev 5)
│   │
│   ├── stores/                         ← Zustand state stores (Dev 3)
│   │   ├── useMeshStore.ts             ← Peers, routing table, own node identity
│   │   ├── usePacketStore.ts           ← Packet queue, trace log, delivered messages
│   │   ├── useTopologyStore.ts         ← React Flow nodes/edges derived state
│   │   └── useUIStore.ts               ← UI-only state (selected node, modals)
│   │
│   ├── db/                             ← IndexedDB persistence (Dev 3)
│   │   ├── database.ts                 ← DB initialisation, schema, version migration
│   │   ├── nodeIdentityRepository.ts   ← CRUD for 'node_identity' store
│   │   ├── scfQueueRepository.ts       ← CRUD for 'scf_queue' store
│   │   ├── deliveredPacketRepository.ts← CRUD for 'delivered_packets' store
│   │   ├── emergencyRepository.ts      ← CRUD for 'emergency_markers' store
│   │   └── settingsRepository.ts       ← CRUD for 'settings' store
│   │
│   ├── hooks/                          ← React hooks (Dev 3, Dev 4)
│   │   ├── useMeshEngine.ts            ← Returns singleton MeshEngine; initialises on mount
│   │   ├── useTopologyNodes.ts         ← Derives React Flow nodes from useMeshStore
│   │   ├── useTopologyEdges.ts         ← Derives React Flow edges from useMeshStore
│   │   ├── usePacketTrace.ts           ← Returns formatted trace entries for UI
│   │   └── useEmergency.ts             ← Manages emergency state and acknowledgement
│   │
│   ├── lib/
│   │   ├── nodeId.ts                   ← Node ID generation and retrieval from IDB
│   │   ├── signaling.ts                ← Socket.IO client setup and reconnection logic
│   │   └── constants.ts                ← Re-export of MIRAGE_CONSTANTS for frontend
│   │
│   └── styles/
│       └── globals.css                 ← Global Tailwind CSS + CSS custom properties
│
├── public/
│   └── favicon.ico
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Module Ownership — apps/web

| Folder | Owner | Notes |
|---|---|---|
| `app/` | Dev 4 | Page layout, routing, Next.js structure |
| `components/topology/` | Dev 4 | React Flow integration, visualisation |
| `components/messenger/` | Dev 4 | Demo messaging UI |
| `components/emergency/` | Dev 4 | Emergency UI components |
| `components/shared/` | Dev 4 | Shared UI components |
| `engine/` | Dev 5 | Core protocol; no React dependencies |
| `stores/` | Dev 3 | All Zustand stores |
| `db/` | Dev 3 | IndexedDB repositories |
| `hooks/` | Dev 3 | React hooks bridging engine to UI |
| `lib/` | Dev 2 | Signaling client, node ID utility |

---

## 3. apps/server — Signaling Backend

```
apps/server/
├── src/
│   ├── app.ts                  ← Express app factory; mounts routes + Socket.IO
│   ├── server.ts               ← Entry point; creates HTTP server; prints LAN IP
│   │
│   ├── routes/
│   │   ├── health.ts           ← GET /api/health
│   │   └── nodes.ts            ← GET /api/nodes, GET /api/nodes/:nodeId
│   │
│   ├── signaling/
│   │   ├── signaling.ts        ← Socket.IO namespace setup; registers event handlers
│   │   ├── handlers/
│   │   │   ├── onJoin.ts       ← Handles 'join' event
│   │   │   ├── onOffer.ts      ← Handles 'offer' event
│   │   │   ├── onAnswer.ts     ← Handles 'answer' event
│   │   │   ├── onIceCandidate.ts ← Handles 'ice-candidate' event
│   │   │   ├── onLeave.ts      ← Handles 'leave' event
│   │   │   └── onDisconnect.ts ← Handles socket 'disconnect' event
│   │   └── validation.ts       ← Zod schemas for validating event payloads
│   │
│   ├── registry/
│   │   ├── registry.ts         ← In-memory Map<socketId, RegistryEntry>
│   │   └── registry.types.ts   ← RegistryEntry interface (local to server)
│   │
│   └── utils/
│       ├── logger.ts           ← Console logger with timestamps
│       └── network.ts          ← Utility to get local LAN IP address
│
├── tsconfig.json
└── package.json
```

### Module Ownership — apps/server

| Folder/File | Owner | Notes |
|---|---|---|
| All of `apps/server/` | Dev 1 | Full ownership |

---

## 4. packages/shared — Shared Types & Constants

```
packages/shared/
├── src/
│   ├── index.ts                ← Barrel export; exports everything public
│   │
│   ├── types/
│   │   ├── packet.ts           ← MiragePacket, all payload types, MiragePacketType
│   │   ├── node.ts             ← MirageNode, NodeSummary
│   │   ├── neighbour.ts        ← Neighbour
│   │   ├── routing.ts          ← RoutingEntry, RoutingTable, RoutingTableSnapshot
│   │   ├── queue.ts            ← QueueEntry
│   │   ├── emergency.ts        ← EmergencyMarker
│   │   ├── signaling.ts        ← All Socket.IO payload interfaces (from API_SPEC.md)
│   │   ├── ui.ts               ← TopologyNodeData, TopologyEdgeData, UIMessage, etc.
│   │   └── persistence.ts      ← IndexedDB model types
│   │
│   └── constants/
│       ├── protocol.ts         ← MIRAGE_CONSTANTS
│       ├── idb.ts              ← IDB_CONFIG
│       └── nodeId.ts           ← NODE_ID_PREFIX, ID generation spec
│
├── tsconfig.json
└── package.json
```

### Module Ownership — packages/shared

| File | Initial Author | Rule |
|---|---|---|
| `types/packet.ts` | Dev 1 | Owned by Dev 1; changes require team consensus |
| `types/node.ts` | Dev 1 | Same |
| `types/routing.ts` | Dev 5 | Dev 5 defines; Dev 1 reviews |
| `types/queue.ts` | Dev 3 | Dev 3 defines; all consume |
| `types/ui.ts` | Dev 4 | Dev 4 defines; Dev 3 consumes |
| `constants/protocol.ts` | Dev 1 | Frozen after Phase 1 |

> **Rule:** No developer may add to `packages/shared` without updating `progress.d` with the change. This prevents silent type divergence.

---

## 5. docs — Engineering Documentation

```
docs/
├── PROJECT_OVERVIEW.md     ← Problem, innovation, MVP
├── ARCHITECTURE.md         ← Diagrams and system design
├── PROTOCOL_SPEC.md        ← Packet format, routing, heartbeat
├── API_SPEC.md             ← REST + Socket.IO contracts
├── DATA_MODELS.md          ← All shared TypeScript interfaces
├── FILE_STRUCTURE.md       ← This file
├── IMPLEMENTATION_PLAN.md  ← 6-phase timeline
├── TEAM_ASSIGNMENT.md      ← Per-member module ownership
├── RISK_REGISTER.md        ← Risk tracking
└── DEMO_SCRIPT.md          ← Judging demo script
```

**Rule:** Documents are read-only during implementation. If a change is required, the change must be noted in `progress.d` and the document updated before code is written against the new spec.

---

## 6. Ownership Map

Summary of file ownership across all 5 developers.

| Developer | Primary Directories |
|---|---|
| **Dev 1 — Backend** | `apps/server/`, `packages/shared/types/packet.ts`, `packages/shared/types/node.ts`, `packages/shared/constants/` |
| **Dev 2 — Signaling Client** | `apps/web/src/lib/signaling.ts`, `apps/web/src/lib/nodeId.ts`, integration with Dev 5 engine |
| **Dev 3 — State & Persistence** | `apps/web/src/stores/`, `apps/web/src/db/`, `apps/web/src/hooks/` |
| **Dev 4 — Frontend UI** | `apps/web/src/app/`, `apps/web/src/components/` |
| **Dev 5 — Protocol Engine** | `apps/web/src/engine/`, `packages/shared/types/routing.ts` |

---

*Document version: 1.0 — Mirage Hackathon Blueprint*
