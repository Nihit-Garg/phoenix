# Implementation plan

## Complete

- Phase 0: Android-only, two-app, offline-only architecture; map, GPS, and security policies.
- Phase 1: Civilian and Hospital Android app shells, unique package IDs, Wi-Fi/location permission declarations, Expo development-client configuration, and legacy server/WebRTC removal.
- Phase 2: Shared transport contract, explicit unavailable native adapter in both app dashboards, and a deterministic in-memory transport for protocol/routing tests.

## Next

1. Transport interface.
2. Secure device identity and hospital provisioning.
3. Encrypted envelope helpers and tests (helpers are in place; Android native round-trip tests remain).
4. Wi-Fi Direct discovery.
5. UDP peer transport.
6. Dedupe, routing, relay, and queue integration.
7. Mandatory live-GPS SOS flow.
8. Hospital decryption, dashboard, and offline map.
