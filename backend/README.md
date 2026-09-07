# Mirage backend domain

This folder contains the offline backend/domain boundary shared by the Android
clients: transport contracts, routing rules, envelope schema, and SOS safety
rules. It intentionally contains no HTTP server, database, cloud integration,
or Socket.IO runtime. Android native Wi-Fi Direct and UDP adapters will sit
behind the transport contract.

## Ownership

- `src/protocol/` validates packet shape, canonical signing payloads, metadata, and wire serialization.
- `src/mesh/` owns routing, deduplication, ciphertext-only queues, and mesh orchestration.
- `src/domain/` validates mandatory live-location SOS data.
- `src/transport/` is the native transport port plus a deterministic test double.

The two apps import this folder directly. There is no duplicate shared domain
implementation elsewhere in the repository.
