import { MiragePacket, parsePacket, serializePacket } from '../protocol/messages';
import { EnvelopeDedupeCache, relayEnvelope } from './routing';
import { PeerTransport, TransportEvent } from '../transport/PeerTransport';

export type MeshDisposition = 'delivered' | 'relayed' | 'dropped';
export interface MeshEvent { disposition: MeshDisposition; packet?: MiragePacket; reason?: string; }

/** Connects the pure routing rules to any PeerTransport implementation. */
export class MeshEngine {
  private readonly dedupe = new EnvelopeDedupeCache();
  private readonly listeners = new Set<(event: MeshEvent) => void>();
  private unsubscribe?: () => void;

  constructor(private readonly selfPeerId: string, private readonly recipientKeyId: string | null, private readonly transport: PeerTransport) {}

  start(): void { this.unsubscribe = this.transport.subscribe((event) => { if (event.type === 'message') void this.handleTransportEvent(event); }); }
  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
  subscribe(listener: (event: MeshEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  async send(packet: MiragePacket): Promise<void> {
    this.dedupe.record(packet.envelopeId);
    await this.transport.broadcast(serializePacket(packet));
  }

  private async handleTransportEvent(event: Extract<TransportEvent, { type: 'message' }>): Promise<void> {
    let packet: MiragePacket;
    try { packet = parsePacket(new TextDecoder().decode(event.message.bytes)); }
    catch (error) { return this.emit({ disposition: 'dropped', reason: error instanceof Error ? error.message : 'Invalid packet.' }); }
    if (this.dedupe.hasSeen(packet.envelopeId)) return this.emit({ disposition: 'dropped', packet, reason: 'Duplicate packet.' });
    this.dedupe.record(packet.envelopeId);
    if (packet.to === this.selfPeerId || (packet.to === 'HOSPITALS' && packet.recipientKeyId === this.recipientKeyId)) return this.emit({ disposition: 'delivered', packet });
    try { await this.transport.broadcast(serializePacket(relayEnvelope(packet, this.selfPeerId)), event.message.from.peerId); this.emit({ disposition: 'relayed', packet }); }
    catch (error) { this.emit({ disposition: 'dropped', packet, reason: error instanceof Error ? error.message : 'Packet could not be relayed.' }); }
  }

  private emit(event: MeshEvent): void { for (const listener of this.listeners) listener(event); }
}
