/**
 * frontend/src/engine/types.ts
 *
 * Local type definitions for the protocol engine.
 * These mirror packages/shared — defined here since packages/shared
 * isn't scaffolded yet in the React Native monorepo.
 */

// ─── Packet Types ─────────────────────────────────────────────────────────────

export type MiragePacketType =
  | 'DATA'
  | 'HELLO'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'ROUTE_UPDATE'
  | 'EMERGENCY'
  | 'ACK'
  | 'LEAVE';

export type PacketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';

export interface DataPayload       { text: string; contentType: string; }
export interface HelloPayload      { displayName: string; routingTable: RoutingEntry[]; protocolVersion: string; }
export interface HeartbeatPayload  { sequence: number; queueDepth: number; }
export interface HeartbeatAckPayload { echoSequence: number; }
export interface RouteUpdatePayload  { routes: RoutingEntry[]; }
export interface EmergencyPayload  { text: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; }
export interface AckPayload        { ackedPacketId: string; }
export interface LeavePayload      { reason?: string; }

export type MessagePayload =
  | DataPayload | HelloPayload | HeartbeatPayload | HeartbeatAckPayload
  | RouteUpdatePayload | EmergencyPayload | AckPayload | LeavePayload;

export interface MiragePacket {
  packetId:        string;
  originId:        string;
  destId:          string;
  senderId:        string;
  ttl:             number;
  hopCount:        number;
  type:            MiragePacketType;
  priority:        PacketPriority;
  createdAt:       number;
  lastForwardedAt: number;
  payload:         MessagePayload;
  hopTrace?:       string[];
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export interface RoutingEntry {
  destId:      string;
  nextHopId:   string;  // nodeId of the immediate neighbour to send to
  hopCount:    number;  // total hops to destination via this route
  lastUpdated: number;  // unix ms
}

export type RoutingTable = Map<string, RoutingEntry>;

// ─── Node ─────────────────────────────────────────────────────────────────────

export type NodeStatus = 'self' | 'alive' | 'suspect' | 'dead';

export interface MirageNode {
  nodeId:          string;
  displayName:     string;
  socketId:        string | null;
  status:          NodeStatus;
  lastSeenAt:      number;
  queueDepth:      number | null;
  protocolVersion: string;
}

// ─── SCF Queue ────────────────────────────────────────────────────────────────

export interface QueueEntry {
  id:        string;
  packet:    MiragePacket;
  enqueuedAt: number;
}

// ─── Emergency ────────────────────────────────────────────────────────────────

export interface EmergencyMarker {
  packetId:   string;
  originId:   string;
  text:       string;
  severity:   EmergencyPayload['severity'];
  receivedAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BROADCAST_ADDRESS = '*';
export const DEFAULT_TTL       = 7;
export const PROTOCOL_VERSION  = '1.0';
