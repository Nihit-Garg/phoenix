import * as Crypto from 'expo-crypto';
import { crypto_box_seal, crypto_box_seal_open, crypto_sign_detached, crypto_sign_verify_detached, from_base64 } from 'react-native-libsodium';
import { EncryptedEnvelope, envelopeSigningPayload } from '../../../../backend/src/protocol/envelope';
import { MiragePacket } from '../../../../backend/src/protocol/messages';
import { SosPayload, validateSosPayload } from '../../../../backend/src/domain/sos';
import { SosAckPayload } from '../../../../backend/src/domain/ack';
import { HospitalIdentity } from './identity';

/** Rejects forged, corrupt, and incorrectly addressed messages before decrypting. */
export function decryptSosEnvelope(envelope: EncryptedEnvelope, identity: HospitalIdentity): SosPayload {
  if (envelope.version !== 1) throw new Error('Unsupported envelope version.');
  if (envelope.recipientKeyId !== identity.keyId) throw new Error('Envelope was encrypted for another hospital key.');
  const { signature, ...unsigned } = envelope;
  const authentic = crypto_sign_verify_detached(
    from_base64(signature), envelopeSigningPayload(unsigned), from_base64(envelope.senderSigningPublicKey),
  );
  if (!authentic) throw new Error('Envelope signature verification failed.');
  const plaintext = crypto_box_seal_open(
    from_base64(envelope.ciphertext), from_base64(identity.encryptionPublicKey), from_base64(identity.encryptionSecretKey), 'text',
  );
  const payload = JSON.parse(plaintext) as Partial<SosPayload>;
  if (payload.type !== 'sos' || !payload.location || typeof payload.location.latitude !== 'number' || typeof payload.location.longitude !== 'number') {
    throw new Error('Decrypted envelope does not contain a valid SOS payload.');
  }
  const sos = payload as SosPayload;
  validateSosPayload(sos, envelope.createdAt);
  return sos;
}

export function createSosAckEnvelope(sosEnvelope: MiragePacket, identity: HospitalIdentity): MiragePacket {
  const payload: SosAckPayload = { type: 'ack', sosEnvelopeId: sosEnvelope.envelopeId, hospitalKeyId: identity.keyId, receivedAt: Date.now() };
  const unsigned = {
    version: 1 as const,
    envelopeId: Crypto.randomUUID(),
    recipientKeyId: sosEnvelope.senderEncryptionPublicKey,
    senderEncryptionPublicKey: identity.encryptionPublicKey,
    senderSigningPublicKey: identity.signingPublicKey,
    ciphertext: crypto_box_seal(JSON.stringify(payload), from_base64(sosEnvelope.senderEncryptionPublicKey), 'base64'),
    createdAt: Date.now(),
    hops: 0,
    maxHops: 3,
    path: [],
    kind: 'ack' as const,
    to: sosEnvelope.senderEncryptionPublicKey,
    priority: 'emergency' as const,
  };
  return { ...unsigned, signature: crypto_sign_detached(envelopeSigningPayload(unsigned), from_base64(identity.signingSecretKey), 'base64') };
}
