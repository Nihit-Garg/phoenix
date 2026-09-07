# Demo recovery — 2026-09-08

The previous APK exposed two independent bugs: Nearby 19.3.0 requires fine location on Android 13+, but the adapter omitted that request; Hospital exports URL-safe Base64 without padding, but the provisioning script rejected that alphabet.

## Fixes included

- Both apps request coarse and fine location together, plus version-specific Bluetooth/Nearby permissions, and explicitly check the fine-location grant before starting native discovery.
- Failed startup shows actionable permission guidance with an Open app permissions button and Retry nearby connection button.
- Returning from Settings retries failed startup without another permission prompt or restarting healthy connections.
- Successful startup clears the old network error. Peer counts use the transport's reconciled peer list.
- Provisioning accepts standard or URL-safe Base64, checks exactly 32 canonical bytes per public key, and stores URL-safe unpadded keys as required by native libsodium.
- A Windows UTF-8 BOM is accepted. Only public fields are written into the generated manifest.
- The Civilian screen displays the provisioned Hospital key ID.
- Nearby remains pinned to 19.3.0 to avoid the reported Kotlin metadata mismatch.

## Apply on the testing laptop

Use the ZIP supplied with this fix against the existing Nearby-enabled checkout at C:\p\phoenix. It contains selected replacement source files and instructions, not an APK. If you made additional edits to those same files on that laptop, save a copy before extracting.

Extract the ZIP into C:\p\phoenix and approve replacement of its included files. It contains frontend and hospital subfolders, so do not extract into either app separately. The package does not include or replace your generated Hospital manifest.

## Rebuild Hospital first

```powershell
cd C:\p\phoenix\hospital
npm run typecheck
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease --no-daemon
adb devices -l
```

With only the Hospital phone attached:

```powershell
adb install -r "C:\p\phoenix\hospital\android\app\build\outputs\apk\release\app-release.apk"
```

Keep the existing Hospital app data. Do not uninstall or clear it: that can change its keys. Open it, grant precise location and Nearby devices, and export the complete public manifest to C:\p\hospital-manifest.json.

## Provision and rebuild Civilian

```powershell
cd C:\p\phoenix\frontend
npm run provision -- "C:\p\hospital-manifest.json"
```

Continue only when it prints "Provisioned Civilian build for Hospital key ID: ...". Keep the exported keys in their original format; manual Base64 editing is unnecessary.

```powershell
npm run typecheck
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease --no-daemon
```

Connect one Civilian phone at a time and run this for each:

```powershell
adb install -r "C:\p\phoenix\frontend\android\app\build\outputs\apk\release\app-release.apk"
```

## Test

1. Keep Wi-Fi, Bluetooth and Location on. Open both apps in the foreground, initially on only two phones close together.
2. Grant precise location and Nearby devices. If blocked, use Open app permissions and return to Mirage; startup retries automatically.
3. Confirm the Civilian Hospital key ID matches the Hospital screen, and the unprovisioned warning is gone.
4. Wait for a nearby connection, then press SOS. A Hospital alert followed by verified delivery confirmation on Civilian is the direct-test success criterion.
5. Add the relay phone only after direct SOS and ACK work. Follow ONE_HOP_DEMO.md for positioning to test a relay hop.

## Verification and limitations

The regression suite uses the actual provisioning script with simulated file input/output and both TypeScript adapters with mocked Android/native boundaries. It checks Base64URL round trips, standard-Base64 normalization, malformed-key rejection, public-only output, permissions on API 30/31/33/36, Settings-return recovery, and retry cleanup:

```powershell
cd C:\p\phoenix
node --test scripts/demo-blockers.test.mjs
```

These checks do not simulate radio hardware. The development machine has Java 8 and no configured Android SDK or ADB, so APK compilation and physical SOS/ACK testing must run on the testing laptop and phones.
