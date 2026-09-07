# Mirage

Mirage is an Android-only, offline emergency communication system with two Expo / React Native apps:

- `frontend/`: Mirage Civilian, for SOS and peer messaging.
- `hospital/`: Mirage Hospital, for receiving and managing SOS alerts.

There is no cloud/server backend, browser target, Socket.IO, or WebRTC runtime. The repository `backend/` directory is the offline shared domain layer. The active Android transport uses Google Nearby Connections in `P2P_CLUSTER` mode; the earlier Wi-Fi Direct/UDP adapter remains in source as a fallback.

## Current status

The foundation, encrypted SOS/ACK runtime, bounded GPS capture, ciphertext retry queue, one-hop mesh routing, and automatic Nearby Connections adapters are implemented. The Nearby native module is statically verified and still requires a rebuilt APK plus a physical 3–4 phone test. Durable Hospital alert storage and worldwide region-selectable offline map packs remain future work.

## Run an app on Android

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
