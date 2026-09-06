# Mirage

Mirage is a local-network emergency messaging prototype. Each Expo client joins a
Socket.IO signaling server, then exchanges application packets through WebRTC
DataChannels. The server never relays message payloads after a peer connection
opens.

## Current architecture

- `backend/`: Express + Socket.IO peer registry and WebRTC signaling relay.
- `frontend/`: Expo / React Native UI, Zustand state, WebRTC mesh engine, and
  AsyncStorage-backed store-carry-forward queue.
- The supported development transport is Expo Web in a modern desktop browser.
  Native iOS/Android builds need a native WebRTC module and custom development
  build before they can use `RTCPeerConnection`.

## Run a LAN demo

1. Start the signaling server on the host laptop:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

2. If the printed address is a Docker/VPN adapter, set `LAN_IP` in
   `backend/.env` to the host laptop's active Wi-Fi IPv4 address and restart.

3. Configure the Expo client in `frontend/.env`:

   ```env
   EXPO_PUBLIC_SIGNALING_URL=http://HOST_WIFI_IP:3001
   ```

4. Start Expo from the host laptop:

   ```powershell
   cd frontend
   npm install
   npx expo start --web --lan --clear
   ```

5. Open the LAN URL printed by Expo in a browser on every laptop. Do not use
   `localhost` on a second laptop. Verify `http://HOST_WIFI_IP:3001/api/health`
   opens on each device before testing the app.

## Verification

```powershell
cd backend
npm run build -- --noEmit

cd ..\frontend
npm exec tsc -- --noEmit
```

The live integration check is two or more browser profiles/devices connected to
the same signaling server. The backend log should show one `Node joined` event
per device.
