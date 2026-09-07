# Security and key policy

- Each device will own X25519 encryption and Ed25519 signing keypairs.
- Libsodium will provide public-key encryption and signatures.
- Private keys belong only in Expo SecureStore, backed on Android by Android Keystore.
- AsyncStorage may contain public profiles, cached peer keys, and ciphertext; never private keys or plaintext SOS data.
- Each message uses a fresh cryptographic nonce and a secure UUID.
- Hospital receipt verifies the detached Ed25519 signature before attempting sealed-box decryption. Corrupt, forged, and wrong-key envelopes fail closed.

## Hospital provisioning

The hospital device is provisioned before Civilian APK distribution. Provisioning generates hospital keys and exposes only a public manifest containing hospital ID, public keys, fingerprints, and `keyId`. That manifest is embedded into the Civilian build. Private keys never leave the hospital device.

Key loss or rotation requires a new `keyId`, new hospital provisioning, and a redistributed Civilian build.

## SOS location rule

An SOS must include current `latitude`, `longitude`, `accuracyMeters`, and `capturedAt`. If live GPS cannot reach the accepted accuracy, sending is blocked. No last-known-location or manual-address fallback is permitted for SOS.
