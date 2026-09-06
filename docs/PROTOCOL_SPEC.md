# MIRAGE — Protocol Specification

## Packet shape

Every WebRTC DataChannel payload is JSON encoding of a MiragePacket:

    packetId, originId, destId, senderId, ttl, hopCount, type, priority,
    createdAt, lastForwardedAt, payload, hopTrace

Packet types are DATA, HELLO, HEARTBEAT, HEARTBEAT_ACK, ROUTE_UPDATE,
EMERGENCY, ACK, and LEAVE. The current engine creates and handles DATA, HELLO,
HEARTBEAT, HEARTBEAT_ACK, ROUTE_UPDATE, EMERGENCY, and LEAVE; ACK is reserved.

## Forwarding rules

- An origin sends its initial packet unchanged with hopCount 0.
- An intermediate node admits an incoming packet to its duplicate cache once,
  decrements TTL, increments hopCount, appends itself to hopTrace, and sends the
  copied packet to the selected next hop.
- A destination delivers DATA locally and does not forward it.
- TTL is checked before an intermediate forward. DATA defaults to 7 hops;
  EMERGENCY uses 15 hops; direct control packets use TTL 1.
- Duplicate cache entries are local and expire after five minutes.

## Routing and control traffic

- On DataChannel open, each peer sends one HELLO snapshot; receiving HELLO does
  not create an acknowledgement HELLO, preventing a control-message loop.
- HELLO and ROUTE_UPDATE add a direct route to the sender and merge cheaper
  advertised routes using a distance-vector hop metric.
- When routes change, the node announces a ROUTE_UPDATE to direct peers.
- A heartbeat is sent to each direct peer every three seconds. Three missed
  acknowledgements remove that peer and routes that use it.

## Store-carry-forward

Unroutable DATA packets are ordered EMERGENCY, HIGH, NORMAL, LOW and persisted
in AsyncStorage. Retention limits are 30, 15, 5, and 2 minutes respectively.
When a route appears, non-expired packets are removed from storage and retried.

## Broadcast

An EMERGENCY packet is delivered locally at its origin and sent to every open
direct peer. A receiving peer re-broadcasts it to every direct peer except the
peer that sent that copy. Duplicate suppression prevents loops.
