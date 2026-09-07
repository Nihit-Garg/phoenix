# Three-phone one-hop SOS demo

This is the minimum supported demonstration target:

```text
Phone 1 — Mirage Civilian sender
              |
              | encrypted SOS, hop 0
              v
Phone 2 — Mirage Civilian relay and Wi-Fi Direct group owner
              |
              | opaque relay, hop 1
              v
Phone 3 — Mirage Hospital/Admin
              |
              | encrypted signed ACK through Phone 2
              v
Phone 1 — delivery confirmed
```

All three phones must remain in the foreground for the initial demonstration. Internet and mobile data are not required.

## Build prerequisites

- Node.js compatible with Expo SDK 57
- Android Studio and Android SDK
- JDK 17 or the supported Android Studio bundled JBR
- Android platform tools and `adb`
- Three USB-debugging-enabled Android phones with Wi-Fi Direct support
- Nearby Wi-Fi and location permissions granted
- A real Hospital public manifest provisioned into the Civilian APK

The development machine checked on 2026-09-07 currently has Java 8 and does not expose Android Studio, Android SDK, or `adb`. Native builds cannot be validated until that toolchain is installed and configured.

## Build order

1. Build and install `hospital/` on Phone 3.
2. Open the Hospital app and use **Export public manifest**.
3. Save the exported public JSON on the development machine.
4. From `frontend/`, run:

```powershell
npm run provision -- C:\path\to\hospital-manifest.json
```

5. Confirm the generated Hospital key ID matches Phone 3.
6. Build the Civilian Android app.
7. Install that same provisioned Civilian APK on Phone 1 and Phone 2.

## Connection order

1. Open all three apps and grant requested permissions.
2. On Phone 2, press **Create relay group on this phone**.
3. Wait until Phone 2 displays **Role: relay group owner**.
4. On Phone 1, locate Phone 2 in the peer list and press **Connect**.
5. Wait until Phone 1 displays that it is a client and shows the group-owner address.
6. On Phone 3, locate Phone 2 and press **Connect**.
7. Wait until Phone 3 displays **Connected as client**.
8. On Phone 2, confirm that both clients have appeared and sent signed peer information.

Do not press **Create relay group** on Phone 1. The Hospital app does not expose that control because Phone 3 must be a client for this topology.

## SOS demonstration

1. On Phone 1, enter a name and emergency description.
2. Capture live GPS. Accuracy must be 30 metres or better and the fix must be less than two minutes old when the SOS envelope is created.
3. Press **Send encrypted SOS**.
4. Phone 1 should show sending and then awaiting Hospital acknowledgement.
5. Phone 2's routing trace should show `SOS forwarded as hop 1`.
6. Phone 3 should show `SOS delivered at hop 1` and display the decrypted emergency.
7. Phone 3 creates an encrypted signed ACK.
8. Phone 2's routing trace should show the ACK forwarded.
9. Phone 1 should show `SOS delivery confirmed by the provisioned Hospital`.

## Evidence to capture

For the first successful run, record screenshots or logs showing:

- the same Hospital key ID on Phone 3 and both Civilian builds;
- Phone 2 acting as group owner;
- Phone 1 and Phone 3 acting as clients;
- Phone 2 forwarding SOS as hop 1;
- Phone 3 delivering SOS at hop 1;
- correct decrypted name, emergency, coordinates, and accuracy;
- Phone 2 forwarding the ACK; and
- Phone 1 accepting the Hospital ACK.

## Current limitations

- Kotlin/autolinking behavior is not yet compiled or device-tested.
- Android may expose manufacturer-specific Wi-Fi Direct behavior that requires native adjustments.
- Hospital alerts remain session-only.
- The Hospital ACK is sent immediately and is not durably queued.
- Background execution is not supported for the initial demo.
- The demo targets one relay hop inside one Wi-Fi Direct group, not sequential two-group store-and-forward.
