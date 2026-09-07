import * as Crypto from 'expo-crypto';
import { crypto_box_seal, crypto_sign_detached, from_base64 } from 'react-native-libsodium';
import { envelopeSigningPayload } from '../../../backend/src/envelope';
import { MiragePacket } from '../../../backend/src/messages';
import { SosPayload } from '../../../backend/src/sos';
import { CivilianIdentity } from './identity';
import { HOSPITAL_PUBLIC_MANIFEST } from './hospitalManifest';

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
