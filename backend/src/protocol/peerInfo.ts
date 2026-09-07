export type PeerRole = 'civilian' | 'hospital';

/** Public identity and reachable endpoint exchanged after Wi-Fi Direct connects. */
export interface PeerInfo {
  version: 1;
  peerId: string;
  displayName: string;
  role: PeerRole;
  encryptionPublicKey: string;
  signingPublicKey: string;
  ipAddress: string;
  port: 9000;
  updatedAt: number;
}

export function parsePeerInfo(value: string): PeerInfo {
  const peer = JSON.parse(value) as Partial<PeerInfo>;
  if (
    peer.version !== 1 || !peer.peerId || !peer.displayName ||
    (peer.role !== 'civilian' && peer.role !== 'hospital') ||
    !peer.encryptionPublicKey || !peer.signingPublicKey || !peer.ipAddress ||
    peer.port !== 9000 || typeof peer.updatedAt !== 'number'
  ) throw new Error('Malformed peer information.');
  return peer as PeerInfo;
}
