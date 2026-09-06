# MIRAGE — Progress Tracker (progress.d)

> This file is the single source of truth for what has been built.
> EVERY developer MUST update this file when:
>   1. They complete a deliverable
>   2. They add, modify, or remove a type in `packages/shared`
>   3. They change a public interface (function signature, event name, payload shape)
>   4. They encounter a blocker
>
> Format: Append entries. Never delete entries. Use ISO timestamps.
> File: progress.d (plain text; no special tool needed)

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

---

## Phase 2 — Transport Layer

*(Entries go here as Phase 2 progresses)*

---

## Phase 3 — Protocol & Routing

*(Entries go here as Phase 3 progresses)*

---

## Phase 4 — User Interface

| Timestamp | Developer | Status | Module | Description |
|---|---|---|---|---|
| 2026-09-06T23:30 | Dev4 | DONE | `frontend` | Implemented React Native mobile UI: Home SOS screen with animated ripple button & address card, Message conversation view with avatar bubbles, Main Messages inbox with broadcast banner, Profile screen, and custom bottom navigation bar |

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
| *[first entry goes here]* | Dev1 | `types/packet.ts` | Initial seed — all interfaces added | All modules |

---

## Interface Contract Changes

> Log any change to a public API boundary (MeshEngine events, SignalingClient methods, IDB repository signatures).
> The developer who owns the consumer must acknowledge the change in this log.

| Timestamp | Changed By | Interface | Change Description | Acknowledged By |
|---|---|---|---|---|
| *[first entry goes here]* | — | — | — | — |

---

## Known Issues

> Active bugs or known limitations. Close entries with [RESOLVED] when fixed.

| ID | Reported By | Timestamp | Description | Status |
|---|---|---|---|---|
| — | — | — | No known issues yet | — |

---

## Blockers

> Active blockers that prevent progress. Remove row when resolved.

| Developer | Blocked On | Waiting For | Since |
|---|---|---|---|
| — | — | — | — |

---

## Integration Checkpoint Status

| Checkpoint | Target Hour | Status | Verified By |
|---|---|---|---|
| Phase 1 complete | +6h | ⬜ Pending | — |
| DataChannels open (P2P) | +12h | ⬜ Pending | — |
| 3-hop routing working | +20h | ⬜ Pending | — |
| Topology UI renders live | +26h | ⬜ Pending | — |
| Full MVP scenario passes | +32h | ⬜ Pending | — |
| Demo rehearsed ×2 | +36h | ⬜ Pending | — |

---

*This file is owned by the entire team. Last rule: if you read it and it's out of date, update it.*
