import { crypto_sign_detached, crypto_sign_verify_detached, from_base64 } from 'react-native-libsodium';
import { PeerInfo, peerInfoSigningPayload, SignedPeerInfo, parseSignedPeerInfo } from '../../../../backend/src/protocol/peerInfo';
import { PeerTransport } from '../../../../backend/src/transport/PeerTransport';
import { HospitalIdentity } from '../security/identity';
import { PeerDirectory } from '../storage/PeerDirectory';

export class PeerInfoExchange {
  constructor(private readonly transport: PeerTransport, private readonly identity: HospitalIdentity, private readonly directory = new PeerDirectory()) {}
  start(): () => void { return this.transport.subscribe((event) => { if (event.type === 'message') void this.receive(event.message.from.ipAddress ?? '0.0.0.0', event.message.from.port ?? 9000, new TextDecoder().decode(event.message.bytes)); }); }
  async announce(peerId: string, ipAddress = '0.0.0.0'): Promise<void> {
    const peer: PeerInfo = { version: 1, peerId: this.identity.encryptionPublicKey, displayName: 'Mirage Hospital', role: 'hospital', encryptionPublicKey: this.identity.encryptionPublicKey, signingPublicKey: this.identity.signingPublicKey, ipAddress, port: 9000, updatedAt: Date.now() };
    const signed: SignedPeerInfo = { peer, signature: crypto_sign_detached(peerInfoSigningPayload(peer), from_base64(this.identity.signingSecretKey), 'base64') };
    await this.transport.send(peerId, new TextEncoder().encode(JSON.stringify(signed)));
  }
  private async receive(sourceIp: string, _sourcePort: number, value: string): Promise<void> { let signed: SignedPeerInfo; try { signed = parseSignedPeerInfo(value); } catch { return; } if (!crypto_sign_verify_detached(from_base64(signed.signature), peerInfoSigningPayload(signed.peer), from_base64(signed.peer.signingPublicKey))) return; const verified = { ...signed.peer, ipAddress: sourceIp, port: 9000 as const, updatedAt: Date.now() }; await this.directory.upsert(verified); this.transport.rememberPeerEndpoint?.(verified.peerId, verified.ipAddress, verified.port, verified.displayName); }
}
