# Mirage

Mirage is an Android-only, offline emergency communication system with two Expo / React Native apps:

- `frontend/`: Mirage Civilian, for SOS and peer messaging.
- `hospital/`: Mirage Hospital, for receiving and managing SOS alerts.

There is no cloud/server backend, browser target, Socket.IO, or WebRTC runtime. The repository `backend/` directory is the offline shared domain layer. The active Android transport uses Google Nearby Connections in `P2P_CLUSTER` mode; the earlier Wi-Fi Direct/UDP adapter remains in source as a fallback.

## Current status

The foundation, encrypted SOS/ACK runtime, bounded GPS capture, ciphertext retry queue, one-hop mesh routing, and automatic Nearby Connections adapters are implemented. User phone screenshots show automatic links, live GPS and SOS mesh arrival at hop 1. Verified Hospital processing and the return acknowledgement still require complete acceptance testing. Durable Hospital alert storage and worldwide region-selectable offline map packs remain future work.

## Run an app on Android

The Civilian **Messages** page now supports mutual friend requests, encrypted offline conversations, saved history/outbox, unread indicators and delivery receipts over the existing mesh. See [messaging setup and testing](docs/MESSAGING.md). No new native dependency is required; physical chat acceptance is pending.

Install Android Studio, enable USB debugging, then run one app:

```powershell
cd frontend
npm install
npm run android
```

```powershell
cd hospital
npm install
npm run android
```

After installation, use `npm start` for JavaScript updates. Rebuild after changing a native dependency or `app.json`.

Read [architecture](docs/ARCHITECTURE.md), the [codebase guide](docs/CODEBASE.md), [security](docs/SECURITY.md), [protocol](docs/PROTOCOL.md), [the plan](docs/IMPLEMENTATION_PLAN.md), and the [three-phone one-hop demo guide](docs/ONE_HOP_DEMO.md).
