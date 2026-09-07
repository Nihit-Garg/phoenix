import * as Crypto from 'expo-crypto';
import { crypto_box_seal, crypto_box_seal_open, crypto_sign_detached, crypto_sign_verify_detached, from_base64 } from 'react-native-libsodium';
import { envelopeSigningPayload } from '../../../../backend/src/protocol/envelope';
import { MiragePacket } from '../../../../backend/src/protocol/messages';
import { SosPayload } from '../../../../backend/src/domain/sos';
import { CivilianIdentity } from './identity';
import { HOSPITAL_PUBLIC_MANIFEST } from './hospitalManifest';
import { SosAckPayload, validateSosAckPayload } from '../../../../backend/src/domain/ack';

export function createSosEnvelope(identity: CivilianIdentity, payload: SosPayload): MiragePacket {
  if (!HOSPITAL_PUBLIC_MANIFEST) throw new Error('This Civilian APK has not been provisioned with a hospital public manifest.');
  const unsigned = {
    version: 1 as const,
    envelopeId: Crypto.randomUUID(),
    recipientKeyId: HOSPITAL_PUBLIC_MANIFEST.keyId,
    senderEncryptionPublicKey: identity.encryptionPublicKey,
    senderSigningPublicKey: identity.signingPublicKey,
    ciphertext: crypto_box_seal(JSON.stringify(payload), from_base64(HOSPITAL_PUBLIC_MANIFEST.encryptionPublicKey), 'base64'),
    createdAt: Date.now(),
    hops: 0,
    maxHops: 3,
    path: [],
    kind: 'sos' as const,
    to: 'HOSPITALS' as const,
    priority: 'emergency' as const,
  };
  return { ...unsigned, signature: crypto_sign_detached(envelopeSigningPayload(unsigned), from_base64(identity.signingSecretKey), 'base64') };
}

export function decryptSosAckEnvelope(envelope: MiragePacket, identity: CivilianIdentity): SosAckPayload {
  const manifest = HOSPITAL_PUBLIC_MANIFEST;
  if (!manifest) throw new Error('This Civilian APK has no provisioned Hospital manifest.');
  if (envelope.kind !== 'ack' || envelope.to !== identity.encryptionPublicKey || envelope.recipientKeyId !== identity.encryptionPublicKey) throw new Error('Acknowledgement is addressed to another Civilian.');
  if (envelope.senderSigningPublicKey !== manifest.signingPublicKey || envelope.senderEncryptionPublicKey !== manifest.encryptionPublicKey) throw new Error('Acknowledgement was not sent by the provisioned Hospital keys.');
  const { signature, ...unsigned } = envelope;
  if (!crypto_sign_verify_detached(from_base64(signature), envelopeSigningPayload(unsigned), from_base64(manifest.signingPublicKey))) throw new Error('Acknowledgement signature verification failed.');
  const plaintext = crypto_box_seal_open(from_base64(envelope.ciphertext), from_base64(identity.encryptionPublicKey), from_base64(identity.encryptionSecretKey), 'text');
  const payload = JSON.parse(plaintext) as SosAckPayload;
  validateSosAckPayload(payload);
  if (payload.hospitalKeyId !== manifest.keyId) throw new Error('Acknowledgement Hospital key ID does not match this Civilian build.');
  return payload;
}
