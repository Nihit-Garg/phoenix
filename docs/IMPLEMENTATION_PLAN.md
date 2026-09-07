# Implementation plan

## Complete

- Phase 0: Android-only, two-app, offline-only architecture; map, GPS, and security policies.
- Phase 1: Civilian and Hospital Android app shells, unique package IDs, Wi-Fi/location permission declarations, Expo development-client configuration, and legacy server/WebRTC removal.
- Phase 2: Shared transport contract, Android Wi-Fi Direct/UDP adapters in both apps, and a deterministic in-memory transport for protocol/routing tests.

## Next

1. Hospital provisioning UI/export plus embedding its public manifest in a Civilian build.
2. Physical-phone validation of Wi-Fi Direct discovery, connection lifecycle, and UDP port 9000.
3. ACK, retry/reconnect, ciphertext-only persistent queue, and peer expiry.
4. Protected durable Hospital SOS storage plus Civilian SOS history and delivery status.
5. Complete peers, messaging, settings, Hospital action workflows, and notifications.
6. Region-selectable offline MapLibre packs and Android device validation.
7. Native crypto round-trip, routing, corruption, and multi-device test coverage.
