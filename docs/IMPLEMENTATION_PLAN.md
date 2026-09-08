# Implementation plan

## Complete

- Phase 0: Android-only, two-app, offline-only architecture; map, GPS, and security policies.
- Phase 1: Civilian and Hospital Android app shells, unique package IDs, Wi-Fi/location permission declarations, Expo development-client configuration, and legacy server/WebRTC removal.
- Phase 2: Shared transport contract, primary Android Nearby Connections adapters in both apps, preserved Wi-Fi Direct/UDP fallback source, and a deterministic in-memory transport for protocol/routing tests.

## Next

Civilian messaging is implemented: mutual requests, nearby/card friend addition, encrypted conversations, unread state, receipts and saved retries. Automated tests pass; physical Android acceptance remains next. See [MESSAGING.md](MESSAGING.md).

1. Hospital provisioning UI/export plus embedding its public manifest in a Civilian build.
2. Fresh Android builds and physical-phone validation of automatic Nearby discovery, connection lifecycle, and byte-payload transfer.
3. ACK, retry/reconnect, ciphertext-only persistent queue, and peer expiry.
4. Protected durable Hospital SOS storage plus Civilian SOS history and delivery status.
5. Validate friends/messaging on phones; complete settings, Hospital action workflows, and notifications.
6. Region-selectable offline MapLibre packs and Android device validation.
7. Native crypto round-trip, routing, corruption, and multi-device test coverage.
