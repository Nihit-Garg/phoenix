# Mirage backend domain

This folder contains the offline backend/domain boundary shared by the Android
clients: transport contracts, routing rules, envelope schema, and SOS safety
rules. It intentionally contains no HTTP server, database, cloud integration,
or Socket.IO runtime. Android native Wi-Fi Direct and UDP adapters will sit
behind the transport contract.

## Ownership

- `src/envelope.ts` validates packet shape and defines the canonical signing payload.
- `src/routing.ts` deduplicates and relays only ciphertext within a hop limit.
- `src/sos.ts` validates the mandatory live-location SOS data.
- `src/transport.ts` is the native transport port plus a deterministic test double.
- `src/messages.ts` owns packet routing metadata and wire serialization.
- `src/queue.ts` owns ciphertext-only store-and-forward queue state.
- `src/mesh.ts` connects packet validation, deduplication, delivery, and relay to a transport adapter.

The two apps import this folder directly. There is no duplicate shared domain
implementation elsewhere in the repository.
