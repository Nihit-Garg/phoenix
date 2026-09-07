# Android development builds

Mirage needs custom Android development builds. Expo Go and Expo Web are not supported runtimes for the future Wi-Fi Direct, UDP, MapLibre, and native crypto modules.

## Wi-Fi Direct validation

Part 1 adds local Android Expo modules to both apps. Rebuild each development
build after native changes, grant the Nearby Wi-Fi permission, and test peer
discovery plus connection with two physical Android phones. The same build now
binds UDP port 9000; verify incoming and outgoing packets after a Wi-Fi Direct
group forms. Expo Go cannot load these modules.

Prerequisites are Node.js 22.13+, Android Studio/SDK, and a USB-debugging-enabled Android phone. Run `npm run android` in `frontend/` or `hospital/`; after installation, run `npm start` for JavaScript updates. Rebuild when native dependencies or `app.json` change.

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
