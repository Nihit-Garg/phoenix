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
| 2026-09-06T16:57 | Dev1 (Nihit) | DONE | `docs/` | All 10 engineering blueprint documents created: PROJECT_OVERVIEW, ARCHITECTURE, PROTOCOL_SPEC, API_SPEC, DATA_MODELS, FILE_STRUCTURE, IMPLEMENTATION_PLAN, TEAM_ASSIGNMENT, RISK_REGISTER, DEMO_SCRIPT |
| 2026-09-06T16:57 | Dev1 (Nihit) | DONE | `progress.md` | Progress tracker created at repo root |
| 2026-09-06T17:09 | Dev1 (Nihit) | DONE | `backend/` | All 19 backend stub files scaffolded with full contract comments |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/utils/network.ts` | Implemented — `getLanIp()`, `getServerUrl()` using `os.networkInterfaces()` |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/utils/logger.ts` | Implemented — `logger.info/warn/error/debug` with ISO timestamp + level + context prefix |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/registry/registry.types.ts` | Implemented — `RegistryEntry`, `NodeSummary` interfaces |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/registry/registry.ts` | Implemented — singleton Map with `upsert/remove/get/getByNodeId/getAll/getAllExcept/size/touch/toSummary` |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/validation.ts` | Implemented — Zod schemas for all 5 inbound Socket.IO events (join, offer, answer, ice-candidate, leave) |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onJoin.ts` | Implemented — validate → upsert registry → emit peer-list to joiner → broadcast new-peer |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onOffer.ts` | Implemented — validate → check target → forward SDP offer with fromSocketId/fromNodeId |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onAnswer.ts` | Implemented — validate → check target → forward SDP answer |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onIceCandidate.ts` | Implemented — silent drop if target gone (ICE-tolerant), forward otherwise |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onLeave.ts` | Implemented — remove from registry → broadcast peer-left with reason:'graceful' |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/handlers/onDisconnect.ts` | Implemented — idempotent safety net for crashes; broadcasts peer-left with reason:'socket-disconnect' |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/signaling/signaling.ts` | Implemented — `setupSignaling(io)` registers all 6 handlers per connected socket |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/routes/health.ts` | Implemented — GET /api/health returns {status, serverTime, connectedPeers, version} |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/routes/nodes.ts` | Implemented — GET /api/nodes (all peers) + GET /api/nodes/:nodeId (404 if not found) |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/app.ts` | Implemented — Express factory with CORS, JSON middleware, mounts health + nodes routes |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/src/server.ts` | Implemented — HTTP server + Socket.IO + setupSignaling + LAN IP startup banner |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/package.json` | Dependencies: express, socket.io, zod, cors + dev: ts-node-dev, typescript, @types/* |
| 2026-09-06T17:21 | Dev1 (Nihit) | DONE | `backend/tsconfig.json` | Strict TypeScript config, outDir: dist, module: commonjs |
| 2026-09-06T17:26 | Dev1 (Nihit) | DONE | `backend/` | **VERIFIED** — `npm run dev` boots successfully. Server listening on port 3001. LAN IP banner printed. SIGINT graceful shutdown confirmed. |

---

## Phase 2 — Transport Layer

*(Entries go here as Phase 2 progresses)*

---

## Phase 3 — Protocol & Routing

*(Entries go here as Phase 3 progresses)*

---

## Phase 4 — User Interface

*(Entries go here as Phase 4 progresses)*

---

## Phase 5 — Resilience

*(Entries go here as Phase 5 progresses)*

---

## Phase 6 — Polish

*(Entries go here as Phase 6 progresses)*

---

## Shared Type Change Log

> Any modification to `packages/shared/` MUST be logged here with the exact interface/type changed.
> This prevents silent breaking changes across the team.

| Timestamp | Developer | File Changed | What Changed | Consumers Affected |
|---|---|---|---|---|
| 2026-09-06T17:21 | Dev1 (Nihit) | `backend/src/registry/registry.types.ts` | Added `RegistryEntry` and `NodeSummary` — server-only types (not in packages/shared) | `registry.ts`, `routes/nodes.ts`, `signaling/handlers/onJoin.ts` |

---

## Interface Contract Changes

> Log any change to a public API boundary (MeshEngine events, SignalingClient methods, IDB repository signatures).
> The developer who owns the consumer must acknowledge the change in this log.

| Timestamp | Changed By | Interface | Change Description | Acknowledged By |
|---|---|---|---|---|
| 2026-09-06T17:21 | Dev1 (Nihit) | Socket.IO `peer-list` event | Payload shape: `{ peers: NodeSummary[] }` — Dev 2 must match this in signaling client | Dev2 — pending |
| 2026-09-06T17:21 | Dev1 (Nihit) | Socket.IO `new-peer` event | Payload shape: `{ peer: NodeSummary }` — Dev 2 must match this in signaling client | Dev2 — pending |
| 2026-09-06T17:21 | Dev1 (Nihit) | Socket.IO `peer-left` event | Payload shape: `{ nodeId, socketId, reason: 'graceful'\|'socket-disconnect' }` — Dev 2 must handle both reasons | Dev2 — pending |
| 2026-09-06T17:21 | Dev1 (Nihit) | Socket.IO `offer`/`answer`/`ice-candidate` forwarded events | All include `fromSocketId` and `fromNodeId` fields — Dev 5 RTCManager must read both | Dev5 — pending |

---

## Known Issues

> Active bugs or known limitations. Close entries with [RESOLVED] when fixed.

| ID | Reported By | Timestamp | Description | Status |
|---|---|---|---|---|
| KI-001 | Dev1 (Nihit) | 2026-09-06T17:26 | `npm audit` shows 3 moderate vulnerabilities from deprecated transitive deps (inflight, rimraf, glob) in ts-node-dev. Not security-critical for LAN-only hackathon demo. | Open — acceptable for demo |

---

## Blockers

> Active blockers that prevent progress. Remove row when resolved.

| Developer | Blocked On | Waiting For | Since |
|---|---|---|---|
| Dev2 | `signaling.ts` client integration | Dev1 server must be running on LAN — ✅ ready | — |
| Dev5 | RTCManager integration | Dev2's `SignalingClient` interface — pending | 2026-09-06 |

---

## Integration Checkpoint Status

| Checkpoint | Target Hour | Status | Verified By |
|---|---|---|---|
| Phase 1 complete | +6h | ✅ Done | Dev1 (Nihit) — 2026-09-06T17:26 |
| DataChannels open (P2P) | +12h | ⬜ Pending | — |
| 3-hop routing working | +20h | ⬜ Pending | — |
| Topology UI renders live | +26h | ⬜ Pending | — |
| Full MVP scenario passes | +32h | ⬜ Pending | — |
| Demo rehearsed ×2 | +36h | ⬜ Pending | — |

---

*This file is owned by the entire team. Last rule: if you read it and it's out of date, update it.*
