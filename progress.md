# Mirage progress

## Product decisions

| Decision | Status |
| --- | --- |
| Android-only MVP | Locked |
| Separate Civilian and Hospital apps | Locked |
| Offline-only delivery | Locked |
| Wi-Fi Direct discovery plus UDP transport | Locked |
| Mandatory live latitude/longitude in every SOS | Locked |
| Worldwide coordinates with region-selectable offline map packs | Locked |
| Libsodium, X25519, Ed25519, SecureStore key policy | Locked |

## Delivery status

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0 — architecture and security decisions | Done | `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PROTOCOL.md` |
| Phase 1 — Android native foundation | Done | Separate `frontend/` and `hospital/` apps, package IDs, permissions, development-client configuration |
| Phase 2 — transport abstraction | Done | `backend/src/transport/PeerTransport.ts`, Android transport adapters, and deterministic in-memory test transport |
| Phase 3 — identity and encryption | In progress | SecureStore-backed X25519/Ed25519 identity helpers, Civilian sealing/signing, Hospital verify-before-decrypt helper, public-manifest export contract, peer-information contract, and versioned envelope schema added; build-time manifest embedding and native round-trip tests remain |
| Phase 4 — Wi-Fi Direct and UDP | In progress | Both local Android modules now expose Wi-Fi Direct discovery/connect lifecycle plus UDP port 9000 bind/send/receive APIs. Physical Android build and two-phone validation remain. |
| Phase 5 — routing, SOS, hospital dashboard | In progress | Dashboards start peer exchange and mesh routing; Civilian uses a persistent ciphertext SOS queue with retry states; Hospital verifies/decrypts SOS and returns signed encrypted ACKs. Hardware tests, durable Hospital ACK queue, and protected SOS persistence remain. |

## 2026-09-07 Phase A continuation

- Added separate native UDP receive and send executors in both Android modules.
- Added correlated native UDP send-result events and TypeScript send timeouts.
- Added discovered-peer lists with connect/disconnect controls in both dashboards.
- Added full shared SOS validation after Hospital decryption.
- Associated verified public-key peer IDs with observed UDP endpoints for targeted replies.
- Added Hospital public-manifest sharing and a validated Civilian build-time provisioning command.
- Added Civilian provisioning status and embedded key-ID display.
- Added encrypted, Hospital-signed SOS acknowledgements verified against the embedded manifest.
- Added a Civilian ciphertext-only SOS queue with exponential retry, five-attempt failure, reconnect flushing, and 24-hour expiry.
- Added verified delivery state and Hospital re-acknowledgement of accepted duplicate retries.
- Defined current GPS as no older than two minutes with limited future-clock tolerance.
- Native compilation and physical two-phone validation remain required.

## 2026-09-07

- Removed the legacy Express/Socket.IO/WebRTC/browser prototype.
- Created the Civilian and Hospital Android app shells.
- Added Expo development-build scripts and Android package identities.
- Declared future Wi-Fi Direct and GPS permissions.
- Replaced project documentation with the offline Android architecture.
- Civilian and Hospital TypeScript checks passed.
- Added a transport contract shared by both apps. The current runtime adapter is explicitly unavailable until Android Wi-Fi Direct and UDP are implemented; it performs no network I/O.
- Added a process-local in-memory transport for deterministic protocol and routing tests only. It is not wired into either Android app.
