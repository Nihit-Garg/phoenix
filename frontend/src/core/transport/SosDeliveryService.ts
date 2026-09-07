import { MeshEngine, MeshEvent } from '../../../../backend/src/mesh/engine';
import { MiragePacket } from '../../../../backend/src/protocol/messages';
import { CivilianIdentity } from '../security/identity';
import { decryptSosAckEnvelope } from '../security/envelope';
import { SosDeliveryEntry, SosDeliveryQueue } from '../storage/SosDeliveryQueue';

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 5_000;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000;

export class SosDeliveryService {
  private readonly sending = new Set<string>();
  private listener?: (entries: SosDeliveryEntry[]) => void;
  private interval?: ReturnType<typeof setInterval>;
  private stopMesh?: () => void;

  constructor(private readonly mesh: MeshEngine, private readonly identity: CivilianIdentity, private readonly queue = new SosDeliveryQueue()) {}

  start(listener: (entries: SosDeliveryEntry[]) => void): () => void {
    this.listener = listener;
    this.stopMesh = this.mesh.subscribe((event) => { void this.handleMeshEvent(event); });
    this.interval = setInterval(() => { void this.flush(); }, 5_000);
    void this.refresh().then(() => this.flush());
    return () => { this.stopMesh?.(); this.stopMesh = undefined; if (this.interval) clearInterval(this.interval); this.interval = undefined; this.listener = undefined; };
  }

  async send(packet: MiragePacket): Promise<SosDeliveryEntry> {
    const queued = await this.queue.enqueue(packet);
    await this.refresh();
    await this.attempt(queued);
    return (await this.queue.list()).find((entry) => entry.packet.envelopeId === packet.envelopeId) ?? queued;
  }

  async flush(): Promise<void> {
    const now = Date.now();
    const entries = await this.queue.list();
    for (const entry of entries) {
      if (entry.state === 'delivered' || entry.state === 'failed' || entry.state === 'expired' || entry.nextAttemptAt > now) continue;
      if (now - entry.packet.createdAt > MAX_QUEUE_AGE_MS) { await this.queue.update(entry.packet.envelopeId, { state: 'expired', error: 'SOS expired before acknowledgement.' }); continue; }
      if (entry.attempts >= MAX_ATTEMPTS) { await this.queue.update(entry.packet.envelopeId, { state: 'failed', error: 'No Hospital acknowledgement after the maximum retry count.' }); continue; }
      await this.attempt(entry);
    }
    await this.refresh();
  }

  private async attempt(entry: SosDeliveryEntry): Promise<void> {
    const envelopeId = entry.packet.envelopeId;
    if (this.sending.has(envelopeId)) return;
    this.sending.add(envelopeId);
    const attempts = entry.attempts + 1;
    await this.queue.update(envelopeId, { state: 'sending', attempts, error: undefined });
    await this.refresh();
    try {
      await this.mesh.send(entry.packet);
      await this.queue.update(envelopeId, { state: 'awaiting-ack', nextAttemptAt: Date.now() + BASE_RETRY_MS * 2 ** (attempts - 1), error: undefined });
    } catch (error) {
      await this.queue.update(envelopeId, { state: attempts >= MAX_ATTEMPTS ? 'failed' : 'retrying', nextAttemptAt: Date.now() + BASE_RETRY_MS * 2 ** (attempts - 1), error: error instanceof Error ? error.message : 'SOS transmission failed.' });
    } finally { this.sending.delete(envelopeId); await this.refresh(); }
  }

  private async handleMeshEvent(event: MeshEvent): Promise<void> {
    if (event.disposition !== 'delivered' || event.packet?.kind !== 'ack') return;
    try {
      const ack = decryptSosAckEnvelope(event.packet, this.identity);
      const entry = (await this.queue.list()).find((item) => item.packet.envelopeId === ack.sosEnvelopeId);
      if (!entry || entry.state === 'delivered') return;
      if (ack.receivedAt < entry.packet.createdAt || ack.receivedAt > Date.now() + 5_000) return;
      await this.queue.update(ack.sosEnvelopeId, { state: 'delivered', acknowledgedAt: ack.receivedAt, nextAttemptAt: Number.MAX_SAFE_INTEGER, error: undefined });
      await this.refresh();
    } catch { /* Invalid or unprovisioned acknowledgements are ignored. */ }
  }

  private async refresh(): Promise<void> { this.listener?.(await this.queue.list()); }
}
