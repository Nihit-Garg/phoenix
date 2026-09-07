# Implementation plan

## Complete

- Phase 0: Android-only, two-app, offline-only architecture; map, GPS, and security policies.
- Phase 1: Civilian and Hospital Android app shells, unique package IDs, Wi-Fi/location permission declarations, Expo development-client configuration, and legacy server/WebRTC removal.
- Phase 2: Shared transport contract, explicit unavailable native adapter in both app dashboards, and a deterministic in-memory transport for protocol/routing tests.

## Next

1. Hospital provisioning UI/export plus embedding its public manifest in a Civilian build.
2. Android Wi-Fi Direct discovery/connect/reconnect implementation in both local Expo modules.
3. UDP port 9000 implementation, packet decoding, and physical-phone tests.
4. Connect the backend mesh engine to native peer transport and persist ciphertext queue/peer metadata.
5. Complete Civilian dispatch/history and Hospital SOS store/dashboard/action workflows.
6. Offline Bengaluru MapLibre pack and Android device validation.
7. Native crypto round-trip, routing, corruption, and multi-device test coverage.
