# Architecture

## Locked decisions

- Android-only MVP.
- Separate Civilian and Hospital/Admin apps.
- Offline-only delivery with no cloud or server dependency.
- Wi-Fi Direct discovers and connects nearby phones.
- UDP port 9000 carries Mirage envelopes.
- Every SOS requires live latitude and longitude.

## Target flow

```text
Civilian UI -> GPS -> encrypted envelope -> routing/dedupe -> UDP -> Wi-Fi Direct peers -> Hospital decrypts -> Dashboard
```

Relays route opaque envelopes. Only the hospital device holds the hospital private key needed to read SOS content.

## Map policy

Coordinates are authoritative. The first map scope is a prebuilt offline Bengaluru MapLibre pack. Address text is optional metadata and never replaces GPS coordinates.

## Project layout

- `frontend/` is the Civilian Android app.
- `hospital/` is the Hospital Android app.
- `backend/` is the offline shared domain layer: transport contracts, envelope/routing rules, and SOS validation. It is not a server.
- No backend directory remains.
