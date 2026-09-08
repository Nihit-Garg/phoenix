# Architecture

## Locked decisions

- Android-only MVP.
- Separate Civilian and Hospital/Admin apps.
- Offline-only delivery with no cloud or server dependency.
- Google Nearby Connections discovers and links nearby phones without internet.
- `P2P_CLUSTER` permits multiple direct nearby links; Mirage's mesh engine relays packets between those links.
- Wi-Fi Direct/UDP remains as an inactive fallback adapter.
- Every SOS requires live latitude and longitude.

## Target flow

```text
Civilian UI -> GPS -> encrypted envelope -> routing/dedupe -> Nearby byte payload -> connected peers -> Hospital decrypts -> Dashboard
```

Relays route opaque envelopes. Only the hospital device holds the hospital private key needed to read SOS content.

## Map policy

The following map capability remains planned.

Coordinates are authoritative worldwide. Mirage supports offline MapLibre packs
for any selected region; packs must be downloaded or provisioned before an
outage because the app never relies on internet access during an emergency.
Address text is optional metadata and never replaces GPS coordinates. When no
pack covers a coordinate, the Hospital workflow still shows precise latitude,
longitude, and accuracy rather than inventing an address.

## Project layout

Civilian Home and Messages share one transport/mesh runtime. `ChatService` subscribes to locally delivered `p2p` events and sends encrypted application payloads through that mesh. Friends pin key pairs after consent; history/outbox snapshots are sealed to the local identity before saving. Fresh retry envelopes carry stable encrypted message IDs to work with the unchanged relay duplicate cache. No additional radio connection, server or Hospital key is needed for chat. See [MESSAGING.md](MESSAGING.md).

- `frontend/` is the Civilian Android app.
- `hospital/` is the Hospital Android app.
- `backend/` is the offline shared domain layer: protocol, mesh routing, SOS validation, and transport contracts. It is not a server.
- `frontend/modules/` and `hospital/modules/` contain each app's Expo-autolinked Android native transport module.
- See `docs/CODEBASE.md` for the ownership map.
