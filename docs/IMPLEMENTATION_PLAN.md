# MIRAGE — Implementation Plan

## Implemented

- Expo / React Native UI with home, peer list, chat, and profile screens.
- Express + Socket.IO signaling relay and live node registry.
- Configured signaling URL through EXPO_PUBLIC_SIGNALING_URL.
- WebRTC offer/answer/ICE relay, direct DataChannels, HELLO route exchange,
  heartbeats, duplicate detection, and in-memory routing.
- AsyncStorage persistence for node identity and SCF queue.
- Priority queue retention and route-triggered queue draining.

## Next engineering milestones

1. Validate the installed native WebRTC transport (react-native-webrtc) in a
   custom Expo development build for Android/iOS.
2. Add integration tests for reconnect, direct messaging, queue drain, broadcast,
   and three-node relay topology.
3. Add a controlled neighbor/topology mode to demonstrate forced multi-hop
   routes instead of a full direct peer graph.
4. Add validated packet schemas, message delivery acknowledgements, route aging,
   and alternate-route retention.
5. Add server event rate limits and an authenticated production signaling mode.

## Definition of done for a LAN demo

- Two browser clients on separate laptops show each other as peers.
- A direct message is delivered after a DataChannel opens.
- A disconnected destination queues a message and the message survives refresh.
- A reconnect restores signaling registration and peer discovery.
- An SOS message reaches all reachable direct peers exactly once.
