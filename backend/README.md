# Mirage backend domain

This folder contains the offline backend/domain boundary shared by the Android
clients: transport contracts, routing rules, envelope schema, and SOS safety
rules. It intentionally contains no HTTP server, database, cloud integration,
or Socket.IO runtime. Android Nearby Connections sits behind the transport
contract; the earlier Wi-Fi Direct/UDP adapter remains inactive.

## Ownership

- `src/protocol/` validates packet shape, canonical signing payloads, metadata, and wire serialization.
- `src/mesh/` owns routing, deduplication, ciphertext-only queues, and mesh orchestration.
- `src/domain/` validates mandatory live-location SOS data.
- `src/transport/` is the native transport port plus a deterministic test double.

The two apps import this folder directly. There is no duplicate shared domain
implementation elsewhere in the repository.

Civilian friend requests and chats use the existing `p2p` envelopes and mesh
without modifying this domain layer. Application consent, receipts, encrypted
storage and retry semantics live in `frontend/src/features/messages/` and are
documented in `docs/MESSAGING.md`.
