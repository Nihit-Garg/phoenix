# Mirage progress

## 2026-09-08 Civilian messaging

Home and Messages now share the existing running mesh. Mutual friend requests (nearby or signed public card), encrypted text conversations, unread badges, verified delivery receipts, encrypted local history/outbox, reconnect/restart retry and clear-conversation are implemented. Twelve messaging tests cover application reliability plus real libsodium operations; phone acceptance is pending. No native transport, discovery or shared routing changes were made. See `docs/MESSAGING.md` and the latest section of `docs/PROJECT_STATUS.md`; older phase notes below are historical.

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

## 2026-09-07 one-hop demo focus

- Added explicit Civilian relay-group creation backed by `WifiP2pManager.createGroup`.
- Client connections now request low group-owner intent so the pre-created relay remains owner.
- Added group-owner/client status and group-owner address visibility.
- Added SOS/ACK routing traces to Civilian and Hospital dashboards.
- Relay broadcast now excludes the inbound source IP and deduplicates UDP destinations.
- Added `docs/ONE_HOP_DEMO.md` with the exact three-phone build, connection, SOS, and evidence flow.
- Android compilation is blocked locally because Java 8 is the only JDK and Android Studio/SDK/ADB are not installed or discoverable.

## 2026-09-07 first-device feedback

- Confirmed that the standalone Hospital and Civilian Android applications compile and launch on a physical Samsung device after adding Windows CMake path normalization and Metro shared-folder configuration.
- Added the missing Android network-state permissions required by the documented Wi-Fi Direct workflow.
- Added an explicit Location Mode readiness check because Android requires Location Mode for peer discovery and peer-list requests.
- Replaced manual group creation and peer buttons with automatic discovery retries and automatic connection negotiation. Civilian devices request group-owner preference; Hospital devices request client preference.
- Replaced the Civilian diagnostic/form screen with a single prominent SOS action modeled on the supplied emergency UI reference.
- SOS now requests permissions at first launch and captures the best available current location when the SOS button is pressed.
- Relaxed the indoor GPS gate from 30 metres/two minutes to 250 metres/five minutes, with a bounded current-fix attempt and a recent-location fallback.
- Physical three-phone validation of automatic group formation, UDP endpoint exchange, relay delivery, and ACK return remains required.

## 2026-09-07

- Removed the legacy Express/Socket.IO/WebRTC/browser prototype.
- Created the Civilian and Hospital Android app shells.
- Added Expo development-build scripts and Android package identities.
- Declared future Wi-Fi Direct and GPS permissions.
- Replaced project documentation with the offline Android architecture.
- Civilian and Hospital TypeScript checks passed.
- Added a transport contract shared by both apps. The current runtime adapter is explicitly unavailable until Android Wi-Fi Direct and UDP are implemented; it performs no network I/O.
- Added a process-local in-memory transport for deterministic protocol and routing tests only. It is not wired into either Android app.
