# MIRAGE — LAN Demo Script

## Preparation

1. Choose one laptop as host and start backend/npm run dev.
2. Set LAN_IP in backend/.env if the banner selects the wrong adapter.
3. Set frontend/.env to EXPO_PUBLIC_SIGNALING_URL=http://HOST_WIFI_IP:3001.
4. Run npx expo start --web --lan --clear from frontend.
5. Open Expo's LAN URL in separate browser profiles or separate laptops.

## Demonstration

1. Open Messages on both devices and show the peer count increase after each
   Node joined backend log.
2. Open a peer conversation, send a normal message, and show it arriving on the
   second device.
3. Trigger SOS once from Home and show the emergency dialog plus receipt on each
   reachable peer.
4. Disconnect a peer, send a message to that peer, and show the queued packet
   count in Profile. Reconnect it and verify the queue drains.
5. Restart the signaling server and verify connected clients re-register after
   Socket.IO reconnect.

## Constraints to state honestly

- Current LAN testing is Expo Web / desktop browser based.
- The default peer discovery pattern creates direct peer links. A controlled
  three-hop topology test is an upcoming engineering task, not the current demo.
- A native phone build needs a native WebRTC module and custom development build.
