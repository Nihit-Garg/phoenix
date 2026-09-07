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
| Phase 2 — transport abstraction | Next | No implementation yet |
| Phase 3 — identity and encryption | Planned | No implementation yet |
| Phase 4 — Wi-Fi Direct and UDP | Planned | No implementation yet |
| Phase 5 — routing, SOS, hospital dashboard | Planned | No implementation yet |

## 2026-09-07

- Removed the legacy Express/Socket.IO/WebRTC/browser prototype.
- Created the Civilian and Hospital Android app shells.
- Added Expo development-build scripts and Android package identities.
- Declared future Wi-Fi Direct and GPS permissions.
- Replaced project documentation with the offline Android architecture.
- Civilian and Hospital TypeScript checks passed.
