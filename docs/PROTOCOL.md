# Offline protocol

UDP packets are versioned JSON envelopes. The planned production envelope contains a unique envelope ID, recipient key ID, sender public keys, sealed ciphertext, creation time, and a detached Ed25519 signature over all non-signature fields. Recipients must verify the signature before attempting sealed-box decryption.

The current `backend/src/envelope.ts` schema fixes that signed-field contract before UDP wiring begins. Its ciphertext remains opaque to relays.

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

After a Wi-Fi Direct connection forms, peers exchange a versioned `PEER_INFO`
record with peer ID, role, display name, public keys, reachable IP address, and
UDP port `9000`. The record is Ed25519-signed by the advertised signing public
key before it is cached. It contains no private key or SOS plaintext.
