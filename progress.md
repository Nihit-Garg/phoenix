# MIRAGE — Progress Tracker (progress.d)

> This file is the single source of truth for what has been built.
> EVERY developer MUST update this file when:
>   1. They complete a deliverable
>   2. They add, modify, or remove a type in `packages/shared`
>   3. They change a public interface (function signature, event name, payload shape)
>   4. They encounter a blocker
>
> Format: Append entries. Never delete entries. Use ISO timestamps.
> File: progress.md (plain text; no special tool needed)

---

## How to Add an Entry

```
[YYYY-MM-DDTHH:MM] | DEV{N} | {STATUS} | {MODULE} | {DESCRIPTION}

STATUS values:
  DONE      — deliverable completed and tested
  IN_PROGRESS — currently working on
  BLOCKED   — waiting on another developer or decision
  CHANGED   — a type/interface/API was modified (MUST log)
  NOTE      — general information; not tied to a specific deliverable
```

---

## Phase 1 — Foundation

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| *[to be filled by team]* | Dev1 | IN_PROGRESS | `packages/shared` | Seeding all shared types from DATA_MODELS.md |
| 2026-09-06T22:30 | Dev3 | IN_PROGRESS | `backend/` | Starting full implementation of all backend stub files |
| 2026-09-06T22:31 | Dev3 | DONE | `backend/src/registry/registry.types.ts` | Implemented RegistryEntry and NodeSummary type definitions |
| 2026-09-06T22:31 | Dev3 | DONE | `backend/src/utils/logger.ts` | Implemented timestamped console logger with info/warn/error/debug levels |
| 2026-09-06T22:32 | Dev3 | DONE | `backend/src/utils/network.ts` | Implemented getLanIp() and getServerUrl() using Node.js os module |
| 2026-09-06T22:32 | Dev3 | DONE | `backend/src/registry/registry.ts` | Implemented in-memory peer registry with upsert/remove/get/getAll/size/toNodeSummary |
| 2026-09-06T22:33 | Dev3 | DONE | `backend/src/signaling/validation.ts` | Implemented Zod schemas for all 5 Socket.IO event payloads |
| 2026-09-06T22:33 | Dev3 | DONE | `backend/src/signaling/handlers/onJoin.ts` | Implemented join handler: validates, upserts registry, emits peer-list + new-peer |
| 2026-09-06T22:34 | Dev3 | DONE | `backend/src/signaling/handlers/onOffer.ts` | Implemented offer handler: validates, forwards SDP offer with sender metadata |
| 2026-09-06T22:34 | Dev3 | DONE | `backend/src/signaling/handlers/onAnswer.ts` | Implemented answer handler: validates, forwards SDP answer with sender metadata |
| 2026-09-06T22:35 | Dev3 | DONE | `backend/src/signaling/handlers/onIceCandidate.ts` | Implemented ICE candidate handler: validates, silently drops on missing target |
| 2026-09-06T22:35 | Dev3 | DONE | `backend/src/signaling/handlers/onLeave.ts` | Implemented graceful leave handler: removes from registry, broadcasts peer-left |
| 2026-09-06T22:35 | Dev3 | DONE | `backend/src/signaling/handlers/onDisconnect.ts` | Implemented idempotent disconnect handler: checks registry first, broadcasts peer-left |
| 2026-09-06T22:36 | Dev3 | DONE | `backend/src/signaling/signaling.ts` | Implemented setupSignaling(): registers all 6 Socket.IO event handlers per connection |
| 2026-09-06T22:36 | Dev3 | DONE | `backend/src/routes/health.ts` | Implemented GET /api/health → {status, serverTime, connectedPeers, version} |
| 2026-09-06T22:37 | Dev3 | DONE | `backend/src/routes/nodes.ts` | Implemented GET /api/nodes and GET /api/nodes/:nodeId with 404 handling |
| 2026-09-06T22:37 | Dev3 | DONE | `backend/src/app.ts` | Implemented Express app factory with env-configurable CORS, JSON middleware, route mounts |
| 2026-09-06T22:38 | Dev3 | DONE | `backend/src/server.ts` | Implemented entry point: HTTP+Socket.IO server, MAX_PEERS limit, LAN IP banner, graceful shutdown |
| 2026-09-06T22:39 | Dev3 | DONE | `backend/` (npm install) | `npm install` completed successfully — 163 packages installed, tsc passes with 0 errors |
| 2026-09-06T22:42 | Dev3 | DONE | `backend/` (live smoke test) | Server started, LAN IP detected (192.168.137.1:3001), all REST endpoints verified |
| 2026-09-06T22:43 | Dev3 | NOTE | `backend/` | VERIFIED: GET /api/health ✅, GET /api/nodes ✅, GET /api/nodes/:id 404 ✅, tsc --noEmit ✅ |
| 2026-09-06T23:03 | Dev3 | DONE | `backend/.gitignore` | Updated gitignore with testing, linting cache, runtime PID, SSL certs, and temp caches |


---

## Phase 2 — Transport Layer

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| 2026-09-06T23:44 | Dev2 (Nihit) | DONE | `frontend/package.json` | Added `socket.io-client ^4.8.1` and `@react-native-async-storage/async-storage ^2.1.2` as dependencies |
| 2026-09-06T23:44 | Dev2 (Nihit) | DONE | `frontend/src/lib/constants.ts` | Implemented — `SIGNALING_URL` from env, `PROTOCOL_VERSION`, `NODE_ID_PREFIX`, storage keys, timing constants |
| 2026-09-06T23:44 | Dev2 (Nihit) | DONE | `frontend/src/lib/nodeId.ts` | Implemented — `getOrCreateNodeId()`, `getOrCreateDisplayName()`, `clearIdentity()` using AsyncStorage |
| 2026-09-06T23:45 | Dev2 (Nihit) | DONE | `frontend/src/lib/signaling.ts` | Implemented — full `SignalingClient` with singleton `signalingClient`; matches all server event shapes; all callbacks for Dev 5 RTCManager |

---

## Phase 3 — Protocol & Routing

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| 2026-09-06T23:49 | Dev5 (Nihit) | DONE | `frontend/src/engine/types.ts` | Defined all engine-local types: MiragePacket, MiragePacketType, all payloads, RoutingEntry, MirageNode, QueueEntry, EmergencyMarker, constants |
| 2026-09-06T23:49 | Dev5 (Nihit) | DONE | `frontend/src/engine/DuplicateCache.ts` | Implemented time-bounded seen-packet cache (5min TTL, 2000 entry cap) with `isDuplicate()` |
| 2026-09-06T23:50 | Dev5 (Nihit) | DONE | `frontend/src/engine/PacketBuilder.ts` | Implemented factory for all 8 packet types + `forwardCopy()` (TTL decrement, hopCount increment, trace append) |
| 2026-09-06T23:50 | Dev5 (Nihit) | DONE | `frontend/src/engine/PacketRouter.ts` | Implemented Bellman-Ford distance-vector routing table with `mergeRoutes()`, `getNextHop()`, `removePeer()` |
| 2026-09-06T23:51 | Dev5 (Nihit) | DONE | `frontend/src/engine/SCFQueue.ts` | Implemented priority-ordered SCF queue (EMERGENCY>HIGH>NORMAL>LOW) with `drainRoutable()` |
| 2026-09-06T23:51 | Dev5 (Nihit) | DONE | `frontend/src/engine/HeartbeatManager.ts` | Implemented 3s interval heartbeat with 3-missed-beat dead detection; `onDead` / `onSuspect` callbacks |
| 2026-09-06T23:52 | Dev5 (Nihit) | DONE | `frontend/src/engine/RTCManager.ts` | Implemented full WebRTC lifecycle: createOffer/Answer, ICE trickle, DataChannel (ordered=false, maxRetransmits=0), peer cleanup |
| 2026-09-06T23:52 | Dev5 (Nihit) | DONE | `frontend/src/engine/MeshEngine.ts` | Implemented full orchestrator singleton: all 8 packet type handlers, SCF drain on topology change, typed event emitter for Dev 3 stores |

---

## Phase 4 — User Interface

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| 2026-09-06T23:30 | Dev4 | DONE | `frontend` | Implemented React Native mobile UI: Home SOS screen with animated ripple button & address card, Message conversation view with avatar bubbles, Main Messages inbox with broadcast banner, Profile screen, and custom bottom navigation bar |
| 2026-09-07T00:43 | Dev3/Dev4 | DONE | `frontend/src/stores/` | Implemented all 3 Zustand stores: `useMeshStore` (peers, routing, identity, connection status), `usePacketStore` (messages, SCF queue, trace log), `useEmergencyStore` (emergency markers + ack) |
| 2026-09-07T00:43 | Dev3 | DONE | `frontend/src/hooks/useMeshEngine.ts` | Implemented engine boot hook: initialises nodeId, connects signalingClient, calls meshEngine.initialize(), wires all 8 engine events to Zustand stores on mount |
| 2026-09-07T00:43 | Dev3 | DONE | `frontend/src/hooks/useEmergency.ts` | Implemented emergency hook: exposes unacknowledged emergencies + broadcastEmergency() action |
| 2026-09-07T00:43 | Dev3 | DONE | `frontend/src/hooks/usePeerMessages.ts` | Implemented per-peer message thread hook: filters messages by peerId + sends via meshEngine |
| 2026-09-07T00:43 | Dev4 | DONE | `frontend/App.tsx` | Wired useMeshEngine() at root — engine now initialises on app start; passes peerId to ChatScreen |
| 2026-09-07T00:43 | Dev4 | DONE | `frontend/src/screens/HomeScreen.tsx` | Integrated with useMeshStore — shows live displayName, real peer count badge, connection status strip; SOS fires real meshEngine.sendEmergency() |
| 2026-09-07T00:43 | Dev4 | DONE | `frontend/src/screens/ChatScreen.tsx` | Integrated with usePeerMessages hook — messages come from engine; send() fires through mesh; empty state + status-aware header |
| 2026-09-07T00:43 | Dev4 | DONE | `frontend/src/screens/MessagesListScreen.tsx` | Integrated with useMeshStore — shows live connected peers, real per-peer last messages, connection/empty states |
| 2026-09-07T00:43 | Dev3/Dev4 | NOTE | `packages/shared` | packages/shared monorepo NOT created — engine types self-contained in frontend/src/engine/types.ts; UI types in frontend/src/types/index.ts |
| 2026-09-07T00:43 | All | NOTE | Platform | Frontend platform changed from Next.js to React Native / Expo. All engine, signaling, and protocol code unchanged. docs/FILE_STRUCTURE.md and docs/TEAM_ASSIGNMENT.md updated to reflect this. |

---

## Phase 5 — Resilience

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| *(entries go here)* | — | — | — | beforeunload LEAVE packet, server rate limiting, IDB SCF persistence, graceful degradation |

---

## Phase 6 — Polish

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| *(entries go here)* | — | — | — | Demo prep, visual polish, README, rehearsal |

---

## Shared Type Change Log

> Any modification to `packages/shared/` MUST be logged here with the exact interface/type changed.
> This prevents silent breaking changes across the team.

| Timestamp | Developer | File Changed | What Changed | Consumers Affected |
|---|---|---|---|---|
| *[first entry goes here]* | Dev1 | `types/packet.ts` | Initial seed — all interfaces added | All modules |
| 2026-09-06T22:31 | Dev3 | `backend/src/registry/registry.types.ts` | Added RegistryEntry (6 fields) and NodeSummary (4 fields) — server-local types, NOT in packages/shared | Backend only |

---

## Interface Contract Changes

> Log any change to a public API boundary (MeshEngine events, SignalingClient methods, IDB repository signatures).
> The developer who owns the consumer must acknowledge the change in this log.

| Timestamp | Changed By | Interface | Change Description | Acknowledged By |
|---|---|---|---|---|
| *[first entry goes here]* | — | — | — | — |
| 2026-09-06T22:38 | Dev3 | `Socket.IO signaling events` | Fully implemented per API_SPEC.md: join→peer-list+new-peer, offer→forward, answer→forward, ice-candidate→forward/drop, leave→peer-left, disconnect→peer-left | ✅ Dev2 ack — 2026-09-06T23:45 |
| 2026-09-06T22:36 | Dev3 | `REST /api/health` | Returns `{status, serverTime, connectedPeers, version}` — matches API_SPEC.md exactly | ✅ Dev2 ack — 2026-09-06T23:45 |
| 2026-09-06T22:37 | Dev3 | `REST /api/nodes` | Returns `{nodes: NodeSummary[], timestamp}` — matches API_SPEC.md exactly | ✅ Dev2 ack — 2026-09-06T23:45 |
| 2026-09-06T22:37 | Dev3 | `REST /api/nodes/:nodeId` | Returns `{node: NodeSummary}` or 404 `{error, message}` | ✅ Dev2 ack — 2026-09-06T23:45 |
| 2026-09-06T23:45 | Dev2 (Nihit) | `SignalingClient` singleton | Exported from `frontend/src/lib/signaling.ts`; all callback slots open for Dev5 RTCManager | Pending Dev5 ack |

---

## Known Issues

> Active bugs or known limitations. Close entries with [RESOLVED] when fixed.

| ID | Reported By | Timestamp | Description | Status |
|---|---|---|---|---|
| — | — | — | No known issues — all endpoints tested and passing | — |

---

## Blockers

> Active blockers that prevent progress. Remove row when resolved.

| Developer | Blocked On | Waiting For | Since |
|---|---|---|---|
| Dev5 | RTCManager | Dev2's `SignalingClient` — ✅ resolved — MeshEngine implemented | RESOLVED |

---

## Integration Checkpoint Status

| Checkpoint | Target Hour | Status | Verified By |
|---|---|---|---|
| Phase 1 complete | +6h | ✅ Done — backend fully implemented and smoke-tested | Dev3 — 2026-09-06T22:43 |
| `GET /api/health` returns 200 | +4h | ✅ Done — returns `{"status":"ok",...}` | Dev3 — 2026-09-06T22:42 |
| Full signaling (offer/answer/ICE) working | +8h | ✅ Done — handlers implemented, Dev2 can integrate | Dev3 — 2026-09-06T22:38 |
| `GET /api/nodes` returning live data | +12h | ✅ Done — returns `{nodes:[], timestamp}` | Dev3 — 2026-09-06T22:42 |
| DataChannels open (P2P) | +12h | ⬜ Pending — needs Dev2 frontend integration | — |
| 3-hop routing working | +20h | ⬜ Pending | — |
| Topology UI renders live | +26h | ⬜ Pending | — |
| Full MVP scenario passes | +32h | ⬜ Pending | — |
| Demo rehearsed ×2 | +36h | ⬜ Pending | — |

---

*This file is owned by the entire team. Last rule: if you read it and it's out of date, update it.*

---

## 2026-09-07 — Expo Mesh Reliability Update

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| 2026-09-07T03:09 | Codex | DONE | `frontend/src/hooks/useMeshEngine.ts` | Removed the fixed join timeout; initializes mesh handlers before connection, joins from Socket.IO `onConnect`, re-registers after reconnect, and reports the configured Expo signaling URL. |
| 2026-09-07T03:09 | Codex | DONE | `frontend/src/engine/` | Fixed duplicate-cache forwarding semantics, HELLO reply loop, emergency relay propagation, route announcements, direct route creation, and SCF queue draining. |
| 2026-09-07T03:09 | Codex | DONE | `frontend/src/engine/SCFQueue.ts` | Added AsyncStorage-backed SCF queue restoration, priority-specific expiry, and persistence after queue changes. |
| 2026-09-07T03:09 | Codex | DONE | `frontend/` | Added `react-native-webrtc` for native development builds; Expo Web remains supported and Expo Go is not a native WebRTC runtime. |
| 2026-09-07T03:09 | Codex | DONE | `backend/` | Corrected the server banner to `EXPO_PUBLIC_SIGNALING_URL`, added `LAN_IP` override support, preferred physical adapters, deduplicated reconnecting node IDs, and constrained SDP event types. |
| 2026-09-07T03:09 | Codex | DONE | `docs/`, `README.md` | Replaced stale Next.js/React Flow/IndexedDB planning material with the current Expo / React Native architecture, protocol, LAN demo, runbook, risks, and roadmap. |
| 2026-09-07T03:09 | Codex | DONE | Verification | `backend` TypeScript check passed; `frontend` TypeScript check passed; Expo Web export passed; backend `/api/health` and `/api/nodes` smoke tests passed on port 3003. |
| 2026-09-07T04:15 | Codex | DONE | `frontend/src/hooks/useMeshEngine.ts`, `frontend/src/lib/signaling.ts` | Stopped browser focus changes from emitting `leave` and treating stale `TARGET_NOT_FOUND` signaling messages as a full Socket.IO disconnect; this keeps active browser peers registered while switching windows. Frontend TypeScript check passed. |
