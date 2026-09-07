import { EncryptedEnvelope } from '../protocol/envelope';

export const DEFAULT_MAX_HOPS = 3;
export class EnvelopeDedupeCache {
  private readonly ids = new Map<string, number>();
  constructor(private readonly maximumEntries = 500, private readonly now: () => number = Date.now) {}
  hasSeen(envelopeId: string): boolean { return this.ids.has(envelopeId); }
  record(envelopeId: string): void {
    this.ids.set(envelopeId, this.now());
    while (this.ids.size > this.maximumEntries) this.ids.delete(this.ids.keys().next().value as string);
  }
}

export function canRelay(envelope: EncryptedEnvelope): boolean {
  return (envelope.hops ?? 0) < (envelope.maxHops ?? DEFAULT_MAX_HOPS);
}

/** Relays only opaque ciphertext while adding no decrypted content to the path. */
export function relayEnvelope(envelope: EncryptedEnvelope, relayPeerId: string): EncryptedEnvelope {
  if (!canRelay(envelope)) throw new Error('Envelope hop limit reached.');
  if (envelope.path?.includes(relayPeerId)) throw new Error('Envelope relay loop detected.');
  return { ...envelope, hops: (envelope.hops ?? 0) + 1, maxHops: envelope.maxHops ?? DEFAULT_MAX_HOPS, path: [...(envelope.path ?? []), relayPeerId] };
}
