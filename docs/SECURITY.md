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

## Nearby transport trust

The first demo automatically accepts Nearby Connections links so a bystander relay only grants permissions once and performs no pairing steps. A Nearby link is therefore not itself treated as authenticated. SOS and acknowledgement packets remain signed and end-to-end encrypted, relays see only ciphertext, and the Civilian accepts delivery only from the provisioned Hospital keys.

Automatic acceptance still permits an untrusted nearby device to consume connection slots or send invalid traffic. Production hardening must add rate and size limits, connection quotas, and an abuse-resistant device-verification policy before Mirage is treated as field-ready.

## SOS location rule

An SOS must include `latitude`, `longitude`, `accuracyMeters`, and `capturedAt`. Mirage first requests a fresh high-accuracy fix. If that request times out, it may use a device location no older than five minutes and accurate to 250 metres so an indoor emergency is not silently blocked. Manual and reverse-geocoded addresses are never substituted for coordinates.
