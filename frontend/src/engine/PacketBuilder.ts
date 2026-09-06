/**
 * frontend/src/engine/PacketBuilder.ts
 *
 * Constructs well-formed MiragePackets.
 * All packet creation goes through this module — never build packets inline.
 */

import {
  MiragePacket, MiragePacketType, PacketPriority,
  DataPayload, HelloPayload, HeartbeatPayload, HeartbeatAckPayload,
  RouteUpdatePayload, EmergencyPayload, LeavePayload,
  RoutingEntry, BROADCAST_ADDRESS, DEFAULT_TTL, PROTOCOL_VERSION,
} from './types';

// Simple ID generator (no crypto.randomUUID needed)
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function makePacketId(originId: string): string {
  return `${originId}-${Date.now()}-${uid()}`;
}

function base(
  originId: string,
  destId: string,
  type: MiragePacketType,
  priority: PacketPriority,
  payload: MiragePacket['payload'],
  ttl = DEFAULT_TTL,
): MiragePacket {
  const now = Date.now();
  return {
    packetId:        makePacketId(originId),
    originId,
    destId,
    senderId:        originId,
    ttl,
    hopCount:        0,
    type,
    priority,
    createdAt:       now,
    lastForwardedAt: now,
    payload,
    hopTrace:        [originId],
  };
}

export const PacketBuilder = {
  data(originId: string, destId: string, text: string, priority: PacketPriority = 'NORMAL'): MiragePacket {
    const payload: DataPayload = { text, contentType: 'text/plain' };
    return base(originId, destId, 'DATA', priority, payload);
  },

  hello(originId: string, destId: string, displayName: string, routingTable: RoutingEntry[]): MiragePacket {
    const payload: HelloPayload = { displayName, routingTable, protocolVersion: PROTOCOL_VERSION };
    return base(originId, destId, 'HELLO', 'HIGH', payload, 1); // TTL=1 — neighbour only
  },

  heartbeat(originId: string, destId: string, sequence: number, queueDepth: number): MiragePacket {
    const payload: HeartbeatPayload = { sequence, queueDepth };
    return base(originId, destId, 'HEARTBEAT', 'NORMAL', payload, 1);
  },

  heartbeatAck(originId: string, destId: string, echoSequence: number): MiragePacket {
    const payload: HeartbeatAckPayload = { echoSequence };
    return base(originId, destId, 'HEARTBEAT_ACK', 'NORMAL', payload, 1);
  },

  routeUpdate(originId: string, destId: string, routes: RoutingEntry[]): MiragePacket {
    const payload: RouteUpdatePayload = { routes };
    return base(originId, destId, 'ROUTE_UPDATE', 'HIGH', payload, 1);
  },

  emergency(originId: string, text: string, severity: EmergencyPayload['severity']): MiragePacket {
    const payload: EmergencyPayload = { text, severity };
    return base(originId, BROADCAST_ADDRESS, 'EMERGENCY', 'EMERGENCY', payload);
  },

  leave(originId: string): MiragePacket {
    const payload: LeavePayload = { reason: 'graceful' };
    return base(originId, BROADCAST_ADDRESS, 'LEAVE', 'HIGH', payload, 1);
  },

  /** Prepare a packet for forwarding — update senderId, decrement TTL, increment hopCount, append trace. */
  forwardCopy(packet: MiragePacket, forwarderId: string): MiragePacket {
    return {
      ...packet,
      senderId:        forwarderId,
      ttl:             packet.ttl - 1,
      hopCount:        packet.hopCount + 1,
      lastForwardedAt: Date.now(),
      hopTrace:        [...(packet.hopTrace ?? []), forwarderId],
    };
  },
};
