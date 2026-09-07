export type PeerStatus = 'discovered' | 'connecting' | 'connected' | 'disconnected';
export type Peer = { deviceAddress: string; deviceName: string; status: PeerStatus };
export type MiragePeerTransportModuleEvents = {
  onStatus: (params: { status: string }) => void;
  onPeer: (params: Peer) => void;
  onError: (params: { message: string }) => void;
};
