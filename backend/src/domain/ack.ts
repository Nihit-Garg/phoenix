export interface SosAckPayload {
  type: 'ack';
  sosEnvelopeId: string;
  hospitalKeyId: string;
  receivedAt: number;
}

export function validateSosAckPayload(payload: SosAckPayload): void {
  if (payload.type !== 'ack') throw new Error('Acknowledgement has an unsupported type.');
  if (!payload.sosEnvelopeId.trim()) throw new Error('Acknowledgement is missing the SOS envelope ID.');
  if (!payload.hospitalKeyId.trim()) throw new Error('Acknowledgement is missing the Hospital key ID.');
  if (!Number.isFinite(payload.receivedAt) || payload.receivedAt <= 0) throw new Error('Acknowledgement has an invalid receipt time.');
}
