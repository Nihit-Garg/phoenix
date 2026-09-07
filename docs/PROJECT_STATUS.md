# Mirage implementation status

Last reviewed: 2026-09-07  
Branch: `anshul-dev`

This is the detailed source of truth for Mirage: the intended behavior, completed work, partial work, known blockers, remaining phases, and the conditions required before the product can be considered ready.

## 1. Scope and locked decisions

Mirage consists of two Android-only Expo/React Native applications and one shared offline domain layer:

- `frontend/`: Mirage Civilian
- `hospital/`: Mirage Hospital/Admin
- `backend/`: shared protocol, routing, queue, transport contracts, and SOS rules; this is not a cloud server

Locked product decisions:

- Emergency operation must not depend on internet, cloud services, Express, Socket.IO, WebRTC, or a browser.
- Nearby connectivity uses Android Wi-Fi Direct and UDP port `9000`.
- Every SOS requires newly captured latitude, longitude, accuracy, and capture time.
- SOS prefers a fresh GPS fix and accepts accuracy up to 250 metres so indoor emergencies are not rejected solely because satellite accuracy is poor.
- A location no older than five minutes may be used if a fresh fix cannot be obtained within 15 seconds; manual addresses and reverse-geocoded addresses are not authoritative SOS locations.
- Coordinates are authoritative worldwide.
- Maps use region-selectable offline packs installed before an outage.
- Encryption uses X25519 sealed boxes; authentication uses Ed25519 signatures through libsodium.
- Private keys remain in Expo SecureStore backed by Android Keystore.
- AsyncStorage may contain public peer metadata and ciphertext-only queues, never private keys or plaintext SOS records.
- The Hospital public manifest is embedded in the Civilian APK during provisioning.
- Hospital key rotation creates a new key ID and requires Civilian APK reprovisioning and redistribution.

## 2. Intended end-to-end flow

### 2.1 Provisioning

1. The Hospital app generates X25519 and Ed25519 key pairs.
2. Hospital private keys are saved in SecureStore/Android Keystore.
3. The Hospital exports a public manifest containing its key ID and public keys.
4. An administrator embeds that manifest into a Civilian build.
5. The provisioned Civilian APK is distributed.
6. A Civilian build without a valid manifest keeps SOS transmission disabled.

### 2.2 Nearby connection

1. Both apps request the Android nearby-Wi-Fi or location permission required by the Android version.
2. Both apps verify that Wi-Fi Direct is supported and bind UDP port `9000`.
3. Discovery locates nearby devices.
4. Mirage retries discovery every eight seconds and automatically initiates a connection when a peer appears.
5. Android creates a Wi-Fi Direct group and selects a group owner.
6. The non-owner learns the group owner's local IP address.
7. Devices exchange signed `PEER_INFO` records.
8. Receivers verify the signature before persisting public peer metadata.
9. The actual UDP source IP overrides any address advertised inside the peer record.
10. Mirage reconciles the Android device address, UDP endpoint, and public-key peer ID into one logical peer.

### 2.3 SOS creation and sending

1. The Civilian presses one SOS button; no connection, relay, location, or emergency form setup is required.
2. Mirage requests a high-accuracy Android location and falls back to a recent bounded-accuracy fix if the current request times out.
3. Mirage validates coordinates, accuracy, and capture time.
4. Identity and Hospital provisioning remain mandatory; unavailable transport queues encrypted SOS for retry instead of requiring peer setup.
5. The payload is sealed with the provisioned Hospital X25519 public key.
6. The envelope is signed with the Civilian Ed25519 private key.
7. It is addressed to `HOSPITALS` and the provisioned Hospital key ID.
8. The ciphertext packet is placed in a persistent delivery queue.
9. It is transmitted to connected peers over UDP.

### 2.4 Relay and delivery

1. A Hospital with the matching key ID delivers the packet locally.
2. A non-recipient may relay only the opaque ciphertext.
3. Envelope IDs suppress duplicates.
4. Hop limits and path tracking prevent unlimited propagation and relay loops.
5. Disconnected devices retain ciphertext and forward it after reconnection.
6. Relays never obtain SOS plaintext or Hospital private keys.

### 2.5 Hospital processing and acknowledgement

1. The Hospital checks that the packet targets its key ID.
2. It verifies the sender signature before decryption.
3. It decrypts using its protected X25519 private key.
4. It applies the complete SOS validator after decryption.
5. A valid SOS is deduplicated, saved in protected storage, and shown as active.
6. The Hospital creates and sends a signed acknowledgement referencing the SOS envelope ID.
7. The Civilian marks the SOS delivered only after accepting that acknowledgement.
8. Hospital staff can mark the case responding or resolved, record actions, and reply.

## 3. Completed work

### Architecture and applications

- Removed the earlier browser/server/WebRTC/Socket.IO direction.
- Established the Android-only, offline-only architecture.
- Created separate Civilian and Hospital Expo apps with distinct package IDs.
- Created a shared offline `backend/` domain layer.
- Added Expo development-client configuration and Android permissions.
- Organized protocol, domain, mesh, transport, security, storage, and feature code.
- Kept a local native transport module in each app for Expo autolinking.

### Identity and cryptography

- Civilian X25519 and Ed25519 identity generation is implemented.
- Hospital X25519 and Ed25519 identity generation and key IDs are implemented.
- Private identities use Expo SecureStore.
- Civilian SOS sealed encryption and signature creation are implemented.
- Hospital verify-before-decrypt behavior is implemented.
- Hospital public-manifest schema, parsing, serialization, and export helpers exist.
- Hospital dashboard provides an explicit public-manifest share action.
- Civilian includes a repeatable `npm run provision -- <manifest.json>` build-time command.
- The provisioning command validates schema, base64 encoding, and both 32-byte public keys before generating the embedded TypeScript manifest.
- Civilian displays whether it is provisioned and the embedded Hospital key ID.
- Civilian SOS is blocked when the embedded manifest is absent.

### GPS and SOS rules

- Shared SOS payload types and validation exist.
- Name and emergency-description validation exist.
- Coordinate, accuracy, and timestamp validation exist.
- The maximum accepted GPS accuracy is 250 metres.
- A captured SOS location is considered fresh for five minutes and future-dated fixes beyond five seconds of clock tolerance are rejected.
- Civilian requests location permission at first launch and captures location automatically on SOS press.
- A recent device location may be used after a 15-second current-fix timeout; manual and reverse-geocoded addresses remain excluded.

### Protocol, routing, and queue foundations

- Versioned encrypted envelope parsing exists.
- SOS, peer-to-peer, peer-information, and acknowledgement packet kinds are defined.
- Wire serialization and routing metadata exist.
- In-memory duplicate suppression exists.
- Hop-limit and relay-loop checks exist.
- The mesh engine can deliver matching packets and relay non-matching packets.
- A deterministic in-memory transport exists for future tests.
- A memory queue contract exists, but it is not connected to runtime delivery.

### Wi-Fi Direct and UDP source

- Both Kotlin modules initialize Wi-Fi Direct and check device support.
- Discovery, peer events, connect, disconnect, and connection-information functions exist.
- Lifecycle registration and cleanup exist.
- UDP bind, receive, send, error, and cleanup source exists for port `9000`.
- UDP receive and send now use separate native executors, preventing the permanent receive loop from starving outgoing packets.
- Every outgoing datagram now carries a request ID and emits a correlated native success or failure result.
- TypeScript waits for the native result and rejects sends that fail or exceed the five-second timeout.
- Transport startup now fails instead of reporting ready when UDP port `9000` cannot be bound.
- Both TypeScript adapters expose status, peers, messages, send, and broadcast behavior.
- Incoming UDP source addresses are used for inbound endpoints.

The native source has not yet been proven by successful build and physical-device tests.

### Signed peer exchange

- The public peer-record schema and canonical signing payload exist.
- Both apps can sign and announce their public peer information.
- Both apps verify peer signatures before persistence.
- Peer directories store only validated public metadata in AsyncStorage.
- UDP source IP overrides the advertised address.
- Both dashboards start peer exchange after identity initialization.
- Connected endpoints trigger announcements.
- Repeated UDP packets do not continuously create new connected-peer events.
- A verified public-key peer ID is now associated with its observed UDP endpoint for targeted sends.

### Initial runtime/SOS integration

- Both dashboards start a mesh engine after identity initialization.
- Civilian performs full shared SOS validation before encryption.
- Civilian can create a sealed, signed packet and pass it to the mesh transport.
- Civilian displays local acceptance or synchronous failure state.
- Both dashboards display discovered peers and expose connect/disconnect controls.
- Civilian exposes explicit relay-group creation; client joins request the lowest group-owner intent.
- Both dashboards display whether they are group owner or client and show the group-owner address when available.
- Both dashboards include a bounded routing trace for SOS/ACK hop verification during the demo.
- Relay broadcast excludes every endpoint sharing the inbound sender IP and deduplicates destinations by IP.
- Hospital mesh delivery is filtered by its key ID.
- Hospital verifies and decrypts delivered SOS packets.
- Hospital applies the complete shared SOS validator after decryption.
- Hospital deduplicates alerts for the current session.
- Hospital displays the name, emergency, coordinates, and GPS accuracy.
- Hospital creates an encrypted, signed ACK after accepting an SOS and re-sends it for accepted duplicate retries.
- Civilian verifies Hospital encryption/signing keys against the embedded manifest before accepting an ACK.
- Civilian persists encrypted SOS packets and delivery metadata in a ciphertext-only AsyncStorage queue.
- Civilian retries with exponential backoff, a five-attempt limit, reconnection-triggered flushing, and 24-hour expiry.
- Civilian displays queued, sending, awaiting-ACK, retrying, delivered, failed, and expired states.

### Documentation and static verification

- Architecture, codebase, security, protocol, implementation, development, and progress documentation exists.
- Civilian TypeScript validation passes.
- Hospital TypeScript validation passes.
- `git diff --check` passes, with only non-failing Windows line-ending notices.

## 4. Partial work and known blockers

### Connection workflow requires hardware validation

Both apps display discovered devices and invoke `connect(peerId)` or disconnect through the UI. Civilian can explicitly create the relay group, while client connection requests use low group-owner intent. The workflow has not been compiled or exercised on physical Android hardware, and automatic connection remains intentionally undefined.

### Native UDP fix is not hardware-verified

Separate native receive/send executors and correlated send-result events are implemented. A real Android build is still required to confirm the Expo bridge event shape, socket behavior, and lifecycle handling.

### “Sent” is not confirmed transmission or delivery

TypeScript now waits for a correlated native socket-send result, so local success means Android's UDP socket accepted the datagram. UDP remains connectionless: this still does not prove Hospital receipt. A signed Hospital ACK is required for confirmed delivery.

### Provisioning requires a real Hospital device and APK build

The Hospital now exposes an administrator share action and Civilian has a validated build-time import command. A real Hospital manifest has not been exported or embedded, so `frontend/src/core/security/hospitalManifest.ts` remains `null` and SOS remains intentionally disabled.

### Peer identities are not fully reconciled

Verified peer information now maps the stable public-key peer ID to the observed UDP endpoint. The original Wi-Fi Direct device-address entry can still coexist because Android does not directly expose a reliable mapping between that address and the remote client IP. Further cleanup and device testing are required.

### Hospital validation is implemented but untested on-device

The Hospital checks signature, target key, decryption, payload structure, non-empty fields, GPS accuracy, and timestamp using the shared validator. Corrupt and hostile input coverage still needs automated and physical tests.

### Alerts and routing are session-only

Hospital alerts disappear on restart. Plaintext SOS data cannot safely be placed in AsyncStorage. Relay dedupe is also in memory, and the ciphertext queue is not connected, so store-and-forward does not yet work.

### Reliable delivery needs hardware and automated validation

ACK creation, encryption, signing, routing, validation, SOS correlation, retry state, and Civilian queue persistence are implemented in source. Hospital ACK packets are sent immediately but are not yet durably queued if the return path is unavailable. Queue mutation concurrency, restart recovery, retry timing, and multi-hop ACK behavior need automated and physical tests.

## 5. Remaining implementation phases

### Phase A: Executable two-device connection

- Physically validate the separate native UDP receive/send executors.
- Physically validate correlated native send results and timeout/error propagation.
- Physically validate nearby-peer lists and connect/disconnect controls.
- Refine discovering, connecting, connected, disconnected, and failed states from device observations.
- Define any automatic-connection policy.
- Reconcile device address, endpoint, and Mirage peer ID.
- Reannounce after reconnect or endpoint changes.
- Add peer ping/last-seen behavior and expire stale peers.
- Add automated coverage for full validation after Hospital decryption.

Completion criterion: two physical Android phones connect offline and exchange authenticated peer records.

### Phase B: Provisioning

- Physically validate the Hospital manifest export action.
- Display key ID and creation time.
- Confirm the explicit administrator export behavior on supported Android versions.
- Run the validated Civilian provisioning command with a real manifest.
- Build a Civilian APK and verify the embedded key ID on-device.
- Move the current provisioning status into the future full settings screen.
- Document key rotation and APK redistribution.

Completion criterion: a real Hospital produces a manifest and a Civilian test APK is built with that exact key ID.

### Phase C: Reliable SOS delivery

- Add automated tests for signed ACK creation, trust checks, correlation, and replay handling.
- Add a durable Hospital outbound ACK queue for unavailable return paths.
- Validate ACK routing through physical relay devices.
- Harden concurrent queue mutations and restart recovery with automated tests.
- Validate bounded retry, reconnection triggers, expiry, and terminal failure on-device.
- Validate that retries re-send ACKs without creating duplicate Hospital alerts.
- Refine queued, sending, awaiting ACK, delivered, retrying, expired, and failed UI after device testing.
- Add compliant Civilian SOS history.

Completion criterion: a queued SOS survives temporary disconnection, is delivered after reconnect, receives an ACK, and does not create duplicates.

### Phase D: Hospital operations

- Design protected storage for decrypted SOS records.
- Restore active alerts after restart.
- Add SOS list and detail screens.
- Add active, responding, and resolved transitions.
- Add responder assignment, dispatch notes, replies, and an action log.
- Define behavior when multiple Hospitals handle the same SOS.
- Add local notifications, sound, and vibration.

Completion criterion: Hospital staff can receive, acknowledge, act on, resolve, and later review an SOS fully offline.

### Phase E: Civilian experience

- Add nearby/trusted peer screens.
- Add SOS history and confirmed delivery details.
- Add peer messaging if it remains in MVP scope.
- Add identity, permissions, provisioning, settings, and diagnostics screens.
- Display GPS age and accuracy and define maximum acceptable fix age.
- Add accessible errors, vibration, and protection against accidental repeat submission.

Completion criterion: users can understand readiness, connect, send one valid SOS, see honest delivery status, and review it later.

### Phase F: Worldwide offline maps

- Integrate a compatible MapLibre Android library.
- Define offline tile, source, style, and pack formats.
- Add a region catalog and pre-outage download/provisioning flow.
- Validate pack integrity, disk space, installed state, and update state.
- Render received coordinates without internet.
- Test international coordinates and region boundaries.

Completion criterion: the Hospital can open an SOS on an installed regional map with internet disabled.

### Phase G: Automated testing

- Configure a test runner.
- Test X25519 encryption/decryption and Ed25519 signatures.
- Test corrupt ciphertext, wrong keys, malformed base64, and wrong key IDs.
- Test malformed SOS payloads and GPS accuracy rules.
- Test signed peer records, tampering, and source-IP override.
- Test dedupe, routing, hop limits, relay loops, queues, retries, expiry, and ACK correlation.
- Test one-hop and multi-hop relay paths.
- Add critical UI/state tests and practical native-module tests.

Completion criterion: critical security, protocol, routing, and delivery state behavior is reproducible automatically.

### Phase H: Physical Android validation

- Compile and install both development builds with the local Kotlin modules.
- Verify Expo autolinking in both apps.
- Test permissions across supported Android versions.
- Test Wi-Fi disabled, permission denial, unsupported devices, and app restarts.
- Test discovery and connection on at least two phones with reversed group-owner roles.
- Test UDP binding, sending, backgrounding, reconnection, and socket cleanup.
- Test real-device libsodium and live GPS behavior.
- Test direct SOS on two phones and relay behavior on three to four phones.
- Test duplicate, loop, queue, retry, ACK, battery, and long-running stability behavior.
- Repeat with internet and mobile data disabled.

Current validation state: standalone Android builds now compile and launch on the separate Android Studio laptop. Automatic multi-phone discovery/group negotiation and end-to-end UDP SOS/ACK delivery still require a fresh physical three-phone run with the rebuilt APKs.

Completion criterion: the documented flow succeeds repeatedly on 2–4 physical Android phones without internet.

### Phase I: Security and release readiness

- Threat-model key substitution, replay, flooding, spoofed peers, malicious relays, and stolen devices.
- Add packet-age, replay, size, and parsing-complexity limits.
- Review metadata leakage and Android exported components.
- Define Hospital data retention, deletion, backup, replacement, and key-loss procedures.
- Perform dependency and release-build security reviews.
- Produce controlled signed release APKs.
- Document field setup, provisioning, offline maps, diagnostics, and recovery.

Completion criterion: security, operational, release, and field-acceptance reviews are complete.

## 6. Current verification status

These checks pass:

```text
frontend: npm exec tsc -- --noEmit
hospital: npm exec tsc -- --noEmit
git diff --check
```

These outcomes have not yet been demonstrated:

- Native compilation and installation of the current Kotlin modules
- Two-phone Wi-Fi Direct connection
- UDP transmission from the current native implementation
- Real-device signed peer exchange
- Real-device SOS encryption, transmission, verification, and decryption
- Hospital acknowledgement
- Store-and-forward relay
- Offline-map rendering
- Restart-safe protected Hospital alert storage

Passing TypeScript validation is not proof of native connectivity or emergency readiness.

## 7. Recommended immediate order

1. Fix native UDP threading and send-result behavior.
2. Add nearby-device connection UI and state.
3. Complete peer identity/endpoint reconciliation.
4. Add full Hospital SOS validation.
5. Build both apps and prove signed peer exchange on two phones.
6. Export a real Hospital manifest and embed it in a Civilian test build.
7. Prove one direct encrypted SOS end to end.
8. Validate ACK/retry behavior and add durable Hospital ACK queue plus peer expiry.
9. Prove queued delivery and a three-device relay.
10. Implement protected Hospital operations and Civilian history.
11. Add offline maps, notifications, and remaining screens.
12. Complete automated, multi-device, security, and release testing.

## 8. Definition of done

Mirage is complete only when all of these are true:

- A real Hospital manifest is embedded in a Civilian release build.
- Fresh Android phones can discover, connect, authenticate, and exchange UDP packets offline.
- Civilian cannot send without valid current GPS and a provisioned key.
- A valid SOS is encrypted, signed, transmitted, verified, decrypted, saved, displayed, and acknowledged.
- Civilian reports delivery only after a valid Hospital ACK.
- Disconnected devices retain ciphertext safely and deliver after reconnection.
- Duplicate, corrupt, forged, expired, wrong-key, and over-hop packets are rejected safely.
- Multi-device relay works without exposing SOS plaintext to relays.
- Hospital alerts survive restart in protected storage.
- Installed offline map packs render required worldwide regions.
- Critical automated tests pass.
- Repeated 2–4 phone field tests pass with internet disabled.
- Security, operations, and release-readiness reviews are complete.
