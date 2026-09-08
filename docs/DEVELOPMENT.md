# Android development builds

Mirage needs custom Android development builds. Expo Go and Expo Web cannot load the local Nearby Connections or native crypto modules.

## Nearby Connections validation

Both apps contain an Expo-autolinked Android module backed by Google Play services Nearby Connections `19.3.0`. Version `19.3.0` is pinned because the newer `19.5.0` artifact publishes Kotlin 2.4 metadata that Expo SDK 57's Kotlin 2.1 compiler cannot consume. Rebuild each development build after native changes. On first launch, grant Nearby devices, Bluetooth, and Location permissions. Each app advertises, discovers, and connects automatically using `P2P_CLUSTER`; no group creation or peer-selection screen is required.

Nearby Connections does not need internet during the SOS demonstration, but every participating phone must have compatible Google Play services already installed. The old Wi-Fi Direct/UDP module remains available in source as a fallback and is not selected by the current dashboards.

Prerequisites are Node.js 22.13+, Android Studio/SDK, and a USB-debugging-enabled Android phone. Run `npm run android` in `frontend/` or `hospital/`; after installation, run `npm start` for JavaScript updates. Rebuild when native dependencies or `app.json` change.

## Friends and messaging

Messages uses the installed native dependencies. Matching development clients can load updated JavaScript; rebuild standalone Civilian APKs. Run `node --test scripts/messaging.test.mjs scripts/demo-blockers.test.mjs` from the root and `npm run typecheck` from each app. Follow [MESSAGING.md](MESSAGING.md) for friend setup, two-phone chat, queued reconnect and relay acceptance. Hospital provisioning is unnecessary for chat and remains mandatory for SOS.

## Hospital provisioning

1. Install and open a Hospital Android development build on the Hospital device.
2. In the Hospital key card, choose **Export public manifest**.
3. Save the shared JSON as a local file. It contains public keys only; confirm that its key ID matches the Hospital screen.
4. From `frontend/`, provision the Civilian source:

```powershell
npm run provision -- C:\path\to\hospital-manifest.json
```

5. Review `src/core/security/hospitalManifest.ts` and confirm the expected key ID.
6. Build and distribute a new Civilian APK.

The provisioning command validates the manifest structure, base64 encoding, and 32-byte public-key lengths before replacing the intentionally empty Civilian manifest. Never place the Hospital export's private identity or SecureStore contents in the repository. Hospital key rotation requires repeating this process and redistributing the Civilian APK.
