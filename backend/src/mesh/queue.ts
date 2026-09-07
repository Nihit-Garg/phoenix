import { MiragePacket } from '../protocol/messages';

export type QueueState = 'queued' | 'sending' | 'delivered' | 'failed';
export interface QueuedPacket { packet: MiragePacket; state: QueueState; attempts: number; updatedAt: number; error?: string; }

/** Store-and-forward queue contract. Apps may persist ciphertext queue entries, never plaintext or secret keys. */
export interface PacketQueue {
  enqueue(packet: MiragePacket): void;
  next(): QueuedPacket | undefined;
  markDelivered(envelopeId: string): void;
  markFailed(envelopeId: string, error: string): void;
  snapshot(): readonly QueuedPacket[];
}

export class MemoryPacketQueue implements PacketQueue {
  private readonly entries = new Map<string, QueuedPacket>();
  constructor(private readonly now: () => number = Date.now) {}
  enqueue(packet: MiragePacket): void { if (!this.entries.has(packet.envelopeId)) this.entries.set(packet.envelopeId, { packet, state: 'queued', attempts: 0, updatedAt: this.now() }); }
  next(): QueuedPacket | undefined {
    const entry = [...this.entries.values()].find((item) => item.state === 'queued' || item.state === 'failed');
    if (!entry) return undefined;
    entry.state = 'sending'; entry.attempts += 1; entry.updatedAt = this.now(); return entry;
  }
  markDelivered(envelopeId: string): void { const entry = this.entries.get(envelopeId); if (entry) { entry.state = 'delivered'; entry.updatedAt = this.now(); } }
  markFailed(envelopeId: string, error: string): void { const entry = this.entries.get(envelopeId); if (entry) { entry.state = 'failed'; entry.error = error; entry.updatedAt = this.now(); } }
  snapshot(): readonly QueuedPacket[] { return [...this.entries.values()]; }
}
