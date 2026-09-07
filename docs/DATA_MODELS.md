# MIRAGE — Current Data Models

The executable types are in frontend/src/engine/types.ts and backend/src/registry/registry.types.ts.

## Client mesh models

| Model | Key fields |
| --- | --- |
| MiragePacket | identity, routing header, type, priority, timestamps, payload, hop trace |
| RoutingEntry | destination, immediate next hop, hop count, last update |
| MirageNode | node ID, display name, socket ID, status, last seen, queue depth |
| QueueEntry | ID, packet, enqueue time, expiry time, forward attempts |
| EmergencyMarker | packet ID, origin, text, severity, receipt timestamp |

Packet priorities are LOW, NORMAL, HIGH, and EMERGENCY. Emergency severities
are LOW, MEDIUM, HIGH, and CRITICAL in the current UI/engine contract.

## Backend signaling models

RegistryEntry contains a persistent node ID, current Socket.IO ID, display name,
protocol version, connect time, and activity timestamp. NodeSummary exposes the
safe peer-discovery subset: node ID, socket ID, display name, and connect time.

## Persistence

AsyncStorage keys are @mirage/nodeId, @mirage/displayName, and @mirage/scfQueue.
The queue is serialised JSON and restored at engine initialization. There is no
IndexedDB schema in the current Expo implementation.
