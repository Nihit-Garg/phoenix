# MIRAGE — Signaling API

Base URL: `http://HOST_WIFI_IP:3001`.

## REST

| Endpoint | Response |
| --- | --- |
| `GET /api/health` | `{ status, serverTime, connectedPeers, version }` |
| `GET /api/nodes` | `{ nodes: NodeSummary[], timestamp }` |
| `GET /api/nodes/:nodeId` | `{ node: NodeSummary }`, or `404` |

`NodeSummary` is `{ nodeId, socketId, displayName, connectedAt }`.

## Socket.IO events

| Direction | Event | Payload |
| --- | --- | --- |
| Client → server | `join` | `{ nodeId, displayName, protocolVersion }` |
| Client → server | `offer` | `{ targetSocketId, sdp: { type: 'offer', sdp? } }` |
| Client → server | `answer` | `{ targetSocketId, sdp: { type: 'answer', sdp? } }` |
| Client → server | `ice-candidate` | `{ targetSocketId, candidate }` |
| Client → server | `leave` | `{ nodeId?, reason? }` |
| Server → client | `peer-list` | `{ peers: NodeSummary[] }` |
| Server → client | `new-peer` | `{ peer: NodeSummary }` |
| Server → client | `peer-left` | `{ nodeId, socketId, reason }` |
| Server → client | `offer`, `answer`, `ice-candidate` | sender metadata plus relayed payload |
| Server → client | `signaling-error` | `{ code, message, context? }` |

The server is not a message relay. Mirage packet JSON travels only through
WebRTC DataChannels after negotiation succeeds.

## Client configuration

Expo loads this public build-time value from `frontend/.env`:

```env
EXPO_PUBLIC_SIGNALING_URL=http://HOST_WIFI_IP:3001
```

The server banner prints this exact variable name. `NEXT_PUBLIC_*` is not used.
