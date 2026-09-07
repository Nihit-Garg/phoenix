# Offline protocol

Nearby byte payloads contain versioned JSON envelopes. The envelope contains a unique envelope ID, recipient key ID, sender public keys, sealed ciphertext, creation time, and a detached Ed25519 signature over all non-signature fields. Recipients must verify the signature before attempting sealed-box decryption.

The current `backend/src/protocol/envelope.ts` schema fixes that signed-field contract. Its ciphertext remains opaque to relays.

```text
version, id, fromPeerId, to, type, priority, timestamp, hops, maxHops, path,
senderEncryptionPublicKey, senderSigningPublicKey, recipientKeyId, nonce,
ciphertext, signature
```

SOS payloads encrypt to the hospital public key. P2P payloads encrypt to the recipient key. The sender signs the canonical header and ciphertext. Relays validate outer metadata, deduplicate, enforce max hops, update `hops` and `path`, then forward ciphertext without decrypting.

## Provisioning and peer information

The Hospital exports a public-only, versioned manifest containing its `keyId`
and encryption/signing public keys. That exact manifest is embedded in a
Civilian build during provisioning; private hospital keys never leave SecureStore.

After a Nearby connection forms, peers exchange a versioned `PEER_INFO` record with peer ID, role, display name, and public keys. The current version retains legacy endpoint fields for wire compatibility, but routing uses the observed Nearby endpoint ID rather than an IP socket. The record is Ed25519-signed by the advertised signing public key before it is cached. It contains no private key or SOS plaintext.

## SOS acknowledgement and retry

A Hospital that successfully verifies, decrypts, and validates an SOS creates an encrypted `ack` packet. Its plaintext payload contains the original SOS envelope ID, Hospital key ID, and Hospital receipt time. The ACK is sealed to the Civilian X25519 public key and signed by the Hospital Ed25519 key.

The Civilian accepts an ACK only when:

- it is addressed to the Civilian's encryption public key;
- its sender encryption and signing keys exactly match the embedded Hospital manifest;
- its signature is valid;
- sealed-box decryption succeeds;
- its Hospital key ID matches the embedded manifest;
- it references an SOS in the local ciphertext queue; and
- its receipt time is not earlier than the SOS or unreasonably in the future.

Civilian SOS envelopes are persisted in AsyncStorage with delivery metadata only; the queue contains ciphertext, public envelope headers, attempts, timings, and errors, never decrypted SOS fields. The current policy retries up to five times with exponential delays starting at five seconds and expires an unacknowledged SOS after 24 hours. GPS freshness is evaluated relative to SOS envelope creation, so later store-and-forward delivery does not invalidate a location that was current when the emergency was recorded. A verified ACK changes the queue entry to `delivered`. If an ACK is lost, the Hospital re-acknowledges an already accepted duplicate SOS.
