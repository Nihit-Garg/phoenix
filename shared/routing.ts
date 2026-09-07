import { EncryptedEnvelope } from './envelope';

export const DEFAULT_MAX_HOPS = 3;

/** A bounded, in-memory dedupe window. Persistent queueing belongs to Phase 6 storage. */
export class EnvelopeDedupeCache {
  private readonly ids = new Map<string, number>();

  constructor(private readonly maximumEntries = 500, private readonly now: () => number = Date.now) {}

  hasSeen(envelopeId: string): boolean { return this.ids.has(envelopeId); }

  record(envelopeId: string): void {
    this.ids.set(envelopeId, this.now());
    while (this.ids.size > this.maximumEntries) this.ids.delete(this.ids.keys().next().value as string);
  }
}

export function canRelay(envelope: EncryptedEnvelope & { hops?: number; maxHops?: number }): boolean {
  return (envelope.hops ?? 0) < (envelope.maxHops ?? DEFAULT_MAX_HOPS);
}
