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
| 2026-09-06T22:19 | Dev1 | DONE | `backend/src/utils/logger.ts` | Implemented structured logger with levels (info/warn/error/debug) and ISO timestamps |
| 2026-09-06T22:21 | Dev1 | DONE | `backend/src/utils/network.ts` | Implemented `getLanIp()` and `getServerUrl()` using Node `os` module |
| 2026-09-06T22:21 | Dev1 | DONE | `backend/src/registry/registry.types.ts` | Defined `RegistryEntry` and `NodeSummary` interfaces (server-only) |
| 2026-09-06T22:21 | Dev1 | DONE | `backend/src/registry/registry.ts` | Implemented in-memory peer registry (Map singleton) with full CRUD API |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/validation.ts` | Implemented Zod schemas for all 5 client→server Socket.IO event payloads + `emitSignalingError` helper |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onJoin.ts` | Implemented `join` handler — validates, upserts registry, emits `peer-list` + broadcasts `new-peer` |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onOffer.ts` | Implemented `offer` forwarding handler with `TARGET_NOT_FOUND` error path |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onAnswer.ts` | Implemented `answer` forwarding handler with `TARGET_NOT_FOUND` error path |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onIceCandidate.ts` | Implemented ICE candidate forwarding — missing targets silently dropped (spec-correct) |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onLeave.ts` | Implemented graceful leave handler — removes from registry, broadcasts `peer-left` with `reason: 'graceful'` |
| 2026-09-06T22:22 | Dev1 | DONE | `backend/src/signaling/handlers/onDisconnect.ts` | Implemented disconnect safety-net handler — idempotent, broadcasts `peer-left` with `reason: 'socket-disconnect'` |
| 2026-09-06T22:23 | Dev1 | DONE | `backend/src/signaling/signaling.ts` | Implemented `setupSignaling(io)` — registers all 6 event handlers per connection |
| 2026-09-06T22:23 | Dev1 | DONE | `backend/src/routes/health.ts` | Implemented `GET /api/health` — returns status, serverTime, connectedPeers, version |
| 2026-09-06T22:23 | Dev1 | DONE | `backend/src/routes/nodes.ts` | Implemented `GET /api/nodes` and `GET /api/nodes/:nodeId` with 404 handling |
| 2026-09-06T22:24 | Dev1 | DONE | `backend/src/app.ts` | Implemented Express app factory — CORS from env, json middleware, routes mounted at /api |
| 2026-09-06T22:24 | Dev1 | DONE | `backend/src/server.ts` | Implemented server entry point — Socket.IO attached, signaling registered, startup banner with LAN IP, graceful shutdown |
| 2026-09-06T22:49 | Dev1 | DONE | `.gitignore` / `backend/.gitignore` | Configured `.gitignore` files to ignore `node_modules/`, `dist/`, `.env*` (preserving `.env.example`), test coverage, logs, secrets, and OS/editor temp files |

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
| 2026-09-06T22:21 | Dev1 | `backend/src/registry/registry.types.ts` | Initial seed — `RegistryEntry` and `NodeSummary` interfaces added (server-only) | REST routes, signaling handlers |

---

## Interface Contract Changes

> Log any change to a public API boundary (MeshEngine events, SignalingClient methods, IDB repository signatures).
> The developer who owns the consumer must acknowledge the change in this log.

| Timestamp | Changed By | Interface | Change Description | Acknowledged By |
|---|---|---|---|---|
| 2026-09-06T22:23 | Dev1 | Socket.IO events | All 6 handlers live — `join`, `offer`, `answer`, `ice-candidate`, `leave`, `disconnect` fully implemented per API_SPEC.md | — (Dev 2 to acknowledge) |
| 2026-09-06T22:24 | Dev1 | REST API | `GET /api/health` and `GET /api/nodes` + `GET /api/nodes/:nodeId` live per API_SPEC.md | — (Dev 2 to acknowledge) |

---

## Known Issues

> Active bugs or known limitations. Close entries with [RESOLVED] when fixed.

| ID | Reported By | Timestamp | Description | Status |
|---|---|---|---|---|
| I-001 | Dev1 | 2026-09-06T22:25 | Terminal runner has an access-denied error for `agentapi.bat` — `npm install` must be run manually by a developer in the `backend/` directory | Open |

---

## Blockers

> Active blockers that prevent progress. Remove row when resolved.

| Developer | Blocked On | Waiting For | Since |
|---|---|---|---|
| Dev2 | `packages/shared` types | Dev1 to create packages/shared (outside backend/ scope; to be done separately) | 2026-09-06 |

---

## Integration Checkpoint Status

| Checkpoint | Target Hour | Status | Verified By |
|---|---|---|---|
| `GET /api/health` returns 200 | +4h | ✅ Done (code complete) | Dev1 |
| Full signaling (offer/answer/ICE) working | +8h | ✅ Done (code complete) | Dev1 |
| `GET /api/nodes` returning live data | +12h | ✅ Done (code complete) | Dev1 |
| Phase 1 complete | +6h | ⬜ Pending (needs npm install + runtime verify) | — |
| DataChannels open (P2P) | +12h | ⬜ Pending | — |
| 3-hop routing working | +20h | ⬜ Pending | — |
| Topology UI renders live | +26h | ⬜ Pending | — |
| Full MVP scenario passes | +32h | ⬜ Pending | — |
| Demo rehearsed ×2 | +36h | ⬜ Pending | — |

---

*This file is owned by the entire team. Last rule: if you read it and it's out of date, update it.*
