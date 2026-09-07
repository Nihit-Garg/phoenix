# Offline protocol

UDP packets are versioned JSON envelopes:

```text
version, id, fromPeerId, to, type, priority, timestamp, hops, maxHops, path,
senderEncryptionPublicKey, senderSigningPublicKey, recipientKeyId, nonce,
ciphertext, signature
```

SOS payloads encrypt to the hospital public key. P2P payloads encrypt to the recipient key. The sender signs the canonical header and ciphertext. Relays validate outer metadata, deduplicate, enforce max hops, update `hops` and `path`, then forward ciphertext without decrypting.
