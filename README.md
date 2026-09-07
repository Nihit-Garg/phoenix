# Mirage

Mirage is an Android-only, offline emergency communication system with two Expo / React Native apps:

- `frontend/`: Mirage Civilian, for SOS and peer messaging.
- `hospital/`: Mirage Hospital, for receiving and managing SOS alerts.

There is no cloud/server backend, browser target, Socket.IO, or WebRTC runtime. The repository `backend/` directory is the offline shared domain layer; nearby phones will use Wi-Fi Direct and UDP in the transport phase.

## Current status

Phase 0 and Phase 1 are complete: the offline architecture is locked, legacy server/WebRTC code is removed, and both apps are Android development-build projects. GPS, encryption, Wi-Fi Direct, UDP, maps, and SOS delivery are upcoming phases.

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

Read [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), [protocol](docs/PROTOCOL.md), and [the plan](docs/IMPLEMENTATION_PLAN.md).
