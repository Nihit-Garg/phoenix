# Offline protocol

UDP packets are versioned JSON envelopes. The planned production envelope contains a unique envelope ID, recipient key ID, sender public keys, sealed ciphertext, creation time, and a detached Ed25519 signature over all non-signature fields. Recipients must verify the signature before attempting sealed-box decryption.

The current `backend/src/envelope.ts` schema fixes that signed-field contract before UDP wiring begins. Its ciphertext remains opaque to relays.

```text
version, id, fromPeerId, to, type, priority, timestamp, hops, maxHops, path,
senderEncryptionPublicKey, senderSigningPublicKey, recipientKeyId, nonce,
ciphertext, signature
```

SOS payloads encrypt to the hospital public key. P2P payloads encrypt to the recipient key. The sender signs the canonical header and ciphertext. Relays validate outer metadata, deduplicate, enforce max hops, update `hops` and `path`, then forward ciphertext without decrypting.
