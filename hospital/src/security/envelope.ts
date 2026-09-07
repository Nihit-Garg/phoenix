import { crypto_box_seal_open, crypto_sign_verify_detached, from_base64 } from 'react-native-libsodium';
import { EncryptedEnvelope, envelopeSigningPayload } from '../../../backend/src/envelope';
import { SosPayload } from '../../../backend/src/sos';
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
  return payload as SosPayload;
}
