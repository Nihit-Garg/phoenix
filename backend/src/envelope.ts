/** Versioned, opaque payload sent between Mirage peers over UDP. */
export interface EncryptedEnvelope {
  version: 1;
  envelopeId: string;
  recipientKeyId: string;
  senderEncryptionPublicKey: string;
  senderSigningPublicKey: string;
  ciphertext: string;
  signature: string;
  createdAt: number;
  hops?: number;
  maxHops?: number;
  path?: string[];
}

export function envelopeSigningPayload(envelope: Omit<EncryptedEnvelope, 'signature'>): string {
  return JSON.stringify({
    version: envelope.version, envelopeId: envelope.envelopeId, recipientKeyId: envelope.recipientKeyId,
    senderEncryptionPublicKey: envelope.senderEncryptionPublicKey, senderSigningPublicKey: envelope.senderSigningPublicKey,
    ciphertext: envelope.ciphertext, createdAt: envelope.createdAt,
  });
}

export function parseEnvelope(value: string): EncryptedEnvelope {
  const envelope = JSON.parse(value) as Partial<EncryptedEnvelope>;
  if (
    envelope.version !== 1 || !envelope.envelopeId || !envelope.recipientKeyId ||
    !envelope.senderEncryptionPublicKey || !envelope.senderSigningPublicKey ||
    !envelope.ciphertext || !envelope.signature || typeof envelope.createdAt !== 'number'
  ) throw new Error('Malformed Mirage envelope.');
  return envelope as EncryptedEnvelope;
}
