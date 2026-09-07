# Mirage progress

## Product decisions

| Decision | Status |
| --- | --- |
| Android-only MVP | Locked |
| Separate Civilian and Hospital apps | Locked |
| Offline-only delivery | Locked |
| Wi-Fi Direct discovery plus UDP transport | Locked |
| Mandatory live latitude/longitude in every SOS | Locked |
| Offline Bengaluru map policy | Locked |
| Libsodium, X25519, Ed25519, SecureStore key policy | Locked |

## Delivery status

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0 — architecture and security decisions | Done | `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PROTOCOL.md` |
| Phase 1 — Android native foundation | Done | Separate `frontend/` and `hospital/` apps, package IDs, permissions, development-client configuration |
| Phase 2 — transport abstraction | Done | `backend/src/transport.ts`, dashboard lifecycle/status integration, deterministic in-memory test transport |
| Phase 3 — identity and encryption | In progress | SecureStore-backed X25519/Ed25519 identity helpers, Civilian sealing/signing, Hospital verify-before-decrypt helper, and versioned envelope schema added; native build and envelope round-trip tests still required |
| Phase 4 — Wi-Fi Direct and UDP | In progress | Both local Android modules now expose Wi-Fi Direct discovery/connect lifecycle plus UDP port 9000 bind/send/receive APIs. Physical Android build and two-phone validation remain. |
| Phase 5 — routing, SOS, hospital dashboard | In progress | Backend mesh engine, queue contract, SOS envelope, Hospital decrypt helper, and Civilian live-GPS safety form exist; they are not connected to Android peer transport or a Hospital SOS UI/store |

## 2026-09-07

- Removed the legacy Express/Socket.IO/WebRTC/browser prototype.
- Created the Civilian and Hospital Android app shells.
- Added Expo development-build scripts and Android package identities.
- Declared future Wi-Fi Direct and GPS permissions.
- Replaced project documentation with the offline Android architecture.
- Civilian and Hospital TypeScript checks passed.
- Added a transport contract shared by both apps. The current runtime adapter is explicitly unavailable until Android Wi-Fi Direct and UDP are implemented; it performs no network I/O.
- Added a process-local in-memory transport for deterministic protocol and routing tests only. It is not wired into either Android app.
