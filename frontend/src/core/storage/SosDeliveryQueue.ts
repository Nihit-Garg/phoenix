import AsyncStorage from '@react-native-async-storage/async-storage';
import { MiragePacket, parsePacket } from '../../../../backend/src/protocol/messages';

const KEY = 'mirage.ciphertext-sos-queue.v1';
const MAX_HISTORY_ENTRIES = 50;

export type SosDeliveryState = 'queued' | 'sending' | 'awaiting-ack' | 'retrying' | 'delivered' | 'failed' | 'expired';

export interface SosDeliveryEntry {
  packet: MiragePacket;
  state: SosDeliveryState;
  attempts: number;
  updatedAt: number;
  nextAttemptAt: number;
  error?: string;
  acknowledgedAt?: number;
}

/** Stores encrypted SOS envelopes and delivery metadata only. No SOS plaintext is persisted here. */
export class SosDeliveryQueue {
  async list(): Promise<SosDeliveryEntry[]> {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return [];
    try {
      return (JSON.parse(stored) as SosDeliveryEntry[]).map((entry) => ({ ...entry, packet: parsePacket(JSON.stringify(entry.packet)) })).filter((entry) => entry.packet.kind === 'sos');
    } catch { return []; }
  }

  async enqueue(packet: MiragePacket): Promise<SosDeliveryEntry> {
    if (packet.kind !== 'sos') throw new Error('Only encrypted SOS packets may enter the SOS delivery queue.');
    const entries = await this.list();
    const existing = entries.find((entry) => entry.packet.envelopeId === packet.envelopeId);
    if (existing) return existing;
    const entry: SosDeliveryEntry = { packet, state: 'queued', attempts: 0, updatedAt: Date.now(), nextAttemptAt: Date.now() };
    await this.save([entry, ...entries]);
    return entry;
  }

  async update(envelopeId: string, change: Partial<Omit<SosDeliveryEntry, 'packet'>>): Promise<SosDeliveryEntry | undefined> {
    const entries = await this.list();
    let updated: SosDeliveryEntry | undefined;
    const next = entries.map((entry) => {
      if (entry.packet.envelopeId !== envelopeId) return entry;
      if (entry.state === 'delivered' && change.state !== 'delivered') { updated = entry; return entry; }
      updated = { ...entry, ...change, updatedAt: Date.now() };
      return updated;
    });
    await this.save(next);
    return updated;
  }

  private async save(entries: SosDeliveryEntry[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
  }
}
