export interface RegistryEntry {
  nodeId: string;
  socketId: string;
  displayName: string;
  protocolVersion: string;
  connectedAt: number;
  lastActivityAt: number;
}

export interface NodeSummary {
  nodeId: string;
  socketId: string;
  displayName: string;
  connectedAt: number;
}
