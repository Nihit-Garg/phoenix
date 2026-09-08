# Codebase guide

Mirage has two Android Expo apps and one shared offline domain layer.

## Apps

- `frontend/src/features/` contains Civilian UI features.
- `frontend/src/features/messages/` contains the Friends/conversation screen, protocol model, serialized ChatService and crypto/storage adapter. The Civilian dashboard owns its lifecycle alongside SOS using one mesh.
- `scripts/messaging.test.mjs` covers consent, delivery/retry, real mesh integration, libsodium and encrypted persistence. `docs/MESSAGING.md` describes phone acceptance.
- `frontend/src/core/security/` contains Civilian identity, provisioning, and envelope helpers.
- `frontend/src/core/transport/` adapts the native Android module to the shared transport port.
- `hospital/src/features/` contains Hospital UI features.
- `hospital/src/core/security/` contains Hospital identity and verified decryption helpers.
- `hospital/src/core/transport/` adapts the native Android module to the shared transport port.

Each app keeps `modules/mirage-peer-transport/` locally because Expo autolinks local
native modules per app. The implementations must remain behaviorally identical.

## Offline backend domain

- `backend/src/protocol/` owns wire envelope and packet schema.
- `backend/src/mesh/` owns routing, relay, dedupe, queue, and mesh orchestration.
- `backend/src/domain/` owns SOS validation rules.
- `backend/src/transport/` owns the platform-neutral peer transport contract.

The backend is shared application logic, not a network server. It never owns
private keys, cloud credentials, or plaintext persistence.
