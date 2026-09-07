# MIRAGE — Project Overview

Mirage is an emergency-messaging and local mesh-network prototype. It is built
as an Expo / React Native application with a Node.js signaling server. Its goal
is to demonstrate that nearby devices can discover each other, establish WebRTC
DataChannels, and exchange packets without routing application payloads through
a central server.

## What runs where

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| App | Expo, React Native, Zustand | Mobile-first UI, identity, conversations, SOS controls |
| Mesh engine | TypeScript | Packet creation, duplicate suppression, routes, heartbeats, SCF queue |
| Transport | WebRTC DataChannels | Direct peer-to-peer packet delivery |
| Bootstrap | Socket.IO + Express | Peer registry and SDP/ICE forwarding only |
| Persistence | AsyncStorage | Node identity and store-carry-forward queue |

## Current product scope

- The development/demo target is Expo Web in modern desktop browsers on the
  same LAN or hotspot.
- The UI is React Native; there is no Next.js application in this repository.
- Native iOS/Android WebRTC requires `react-native-webrtc` in a custom native
  development build. Expo Go alone does not provide `RTCPeerConnection`.
- Payload encryption, internet bridging, TURN infrastructure, and production
  authentication are outside this prototype's scope.

## Demonstrable behavior

1. A device joins the signaling server using `EXPO_PUBLIC_SIGNALING_URL`.
2. Existing peers receive discovery events and establish WebRTC DataChannels.
3. Direct messages and SOS broadcasts move over those channels.
4. A no-route packet is retained in the local priority queue until a route is
   available or its retention period expires.
5. Heartbeats remove dead direct peers and invalidate routes that depended on
   them.

The server is required only while a new peer connection is being negotiated.
