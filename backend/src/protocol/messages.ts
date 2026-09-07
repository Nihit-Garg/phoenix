import { EncryptedEnvelope, parseEnvelope } from './envelope';

export type MirageMessageKind = 'sos' | 'p2p' | 'peer-info' | 'ack';
export type MirageRecipient = 'HOSPITALS' | string;

export interface MiragePacket extends EncryptedEnvelope {
  kind: MirageMessageKind;
  to: MirageRecipient;
  priority: 'emergency' | 'normal';
}

export function parsePacket(value: string): MiragePacket {
  const envelope = parseEnvelope(value) as Partial<MiragePacket>;
  if (!envelope.kind || !envelope.to || !envelope.priority) throw new Error('Packet is missing routing metadata.');
  if (!['sos', 'p2p', 'peer-info', 'ack'].includes(envelope.kind)) throw new Error('Unsupported Mirage packet kind.');
  if (!['emergency', 'normal'].includes(envelope.priority)) throw new Error('Unsupported Mirage packet priority.');
  return envelope as MiragePacket;
}

export function serializePacket(packet: MiragePacket): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(packet));
}
