export type NearbyPeerStatus = 'discovered' | 'connecting' | 'connected' | 'disconnected';
export type NearbyPeer = { endpointId: string; endpointName: string; status: NearbyPeerStatus };
export type MirageNearbyTransportModuleEvents = {
  onStatus: (params: { status: string }) => void;
  onPeer: (params: NearbyPeer) => void;
  onError: (params: { message: string }) => void;
  onConnection: (params: { groupFormed: boolean }) => void;
  onPacket: (params: { endpointId: string; payload: string }) => void;
  onSendResult: (params: { requestId: string; success: boolean; error?: string }) => void;
};
