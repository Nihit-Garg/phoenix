# Three-phone one-hop SOS demo

Civilian messaging now runs alongside SOS on the same mesh. Use Home for this demo; switching to Messages does not stop relaying. See [MESSAGING.md](MESSAGING.md) for a separate bidirectional chat acceptance test. Its friend receipts do not replace Hospital SOS acknowledgements.

This is the minimum supported demonstration target:

```text
Phone 1 — Mirage Civilian sender
              |
              | encrypted SOS, hop 0
              v
Phone 2 — Mirage Civilian relay
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
- Three USB-debugging-enabled Android phones with compatible Google Play services
- Nearby devices, Bluetooth, and location permissions granted
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

## Automatic connection

1. Open all three apps and grant requested permissions.
2. Ensure Wi-Fi, Bluetooth, and Android Location Mode are on for all three phones.
3. Leave every app in the foreground. Every phone advertises and discovers through Nearby Connections `P2P_CLUSTER` automatically.
4. Mirage deterministically chooses one side to initiate each discovered link and auto-accepts the matching connection. No relay group, pairing code, or peer-selection action is required for this demo build.
5. Wait until Phone 1 is connected to Phone 2 and Phone 2 is connected to Phone 3.

For a guaranteed one-hop demonstration, place Phone 1 and Phone 3 far enough apart that they do not form a direct Nearby link while Phone 2 remains within radio range of both. If all three phones connect directly, the Hospital can receive hop 0 first; a later relayed copy is correctly rejected as a duplicate.

## SOS demonstration

1. On Phone 1, press the large **SOS** button.
2. Mirage automatically captures a current GPS fix, allowing up to 250 metre accuracy and a five-minute recent fix fallback when a new indoor fix cannot be obtained within 15 seconds.
3. Mirage supplies the default emergency description and creates the encrypted packet without additional form input.
4. Phone 1 should show sending and then awaiting Hospital acknowledgement.
5. Phone 2's routing trace should show `SOS forwarded as hop 1`.
6. Phone 3 should show `SOS delivered at hop 1` and display the decrypted emergency.
7. Phone 3 creates an encrypted signed ACK.
8. Phone 2's routing trace should show the ACK forwarded.
9. Phone 1 should show `SOS delivery confirmed by the provisioned Hospital`.

## Evidence to capture

For the first successful run, record screenshots or logs showing:

- the same Hospital key ID on Phone 3 and both Civilian builds;
- Phone 1 connected to Phone 2 and Phone 2 connected to Phone 3;
- Phone 2 forwarding SOS as hop 1;
- Phone 3 delivering SOS at hop 1;
- correct decrypted name, emergency, coordinates, and accuracy;
- Phone 2 forwarding the ACK; and
- Phone 1 accepting the Hospital ACK.

## Current limitations

- Native compilation and standalone launch of the earlier build are confirmed on one Samsung phone; the new Nearby Connections build and three-phone routing still require physical validation.
- Google Play services must be installed and compatible on every participating phone.
- Hospital alerts remain session-only.
- The Hospital ACK is sent immediately and is not durably queued.
- Background execution is not supported for the initial demo.
- The demo targets one foreground relay hop across Nearby connections; background relaying is not yet supported.
