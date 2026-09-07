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

/** Produces the exact UTF-8 text that must be signed before transmission. */
export function envelopeSigningPayload(envelope: Omit<EncryptedEnvelope, 'signature'>): string {
  return JSON.stringify({
    version: envelope.version,
    envelopeId: envelope.envelopeId,
    recipientKeyId: envelope.recipientKeyId,
    senderEncryptionPublicKey: envelope.senderEncryptionPublicKey,
    senderSigningPublicKey: envelope.senderSigningPublicKey,
    ciphertext: envelope.ciphertext,
    createdAt: envelope.createdAt,
  });
}
