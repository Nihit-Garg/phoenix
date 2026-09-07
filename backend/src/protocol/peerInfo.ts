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

/** Peer information is public, but it must be signed to prevent key substitution. */
export interface SignedPeerInfo { peer: PeerInfo; signature: string; }

export function peerInfoSigningPayload(peer: PeerInfo): string {
  return JSON.stringify(peer);
}

export function parseSignedPeerInfo(value: string): SignedPeerInfo {
  const signed = JSON.parse(value) as Partial<SignedPeerInfo>;
  if (!signed.peer || !signed.signature) throw new Error('Malformed signed peer information.');
  return { peer: parsePeerInfo(JSON.stringify(signed.peer)), signature: signed.signature };
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
