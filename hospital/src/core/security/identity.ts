import * as SecureStore from 'expo-secure-store';
import { crypto_box_keypair, crypto_sign_keypair } from 'react-native-libsodium';

const HOSPITAL_IDENTITY_KEY = 'mirage.hospital.identity.v1';

export interface HospitalIdentity {
  version: 1;
  keyId: string;
  encryptionPublicKey: string;
  encryptionSecretKey: string;
  signingPublicKey: string;
  signingSecretKey: string;
  createdAt: number;
}

export interface HospitalPublicManifest {
  version: 1;
  keyId: string;
  encryptionPublicKey: string;
  signingPublicKey: string;
  createdAt: number;
}

export async function getOrCreateHospitalIdentity(): Promise<HospitalIdentity> {
  const stored = await SecureStore.getItemAsync(HOSPITAL_IDENTITY_KEY);
  if (stored) return parseIdentity(stored);

  const encryption = crypto_box_keypair('base64');
  const signing = crypto_sign_keypair('base64');
  const identity: HospitalIdentity = {
    version: 1,
    keyId: `hospital-${Date.now().toString(36)}`,
    encryptionPublicKey: encryption.publicKey,
    encryptionSecretKey: encryption.privateKey,
    signingPublicKey: signing.publicKey,
    signingSecretKey: signing.privateKey,
    createdAt: Date.now(),
  };
  await SecureStore.setItemAsync(HOSPITAL_IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export function publicManifest(identity: HospitalIdentity): HospitalPublicManifest {
  return {
    version: 1,
    keyId: identity.keyId,
    encryptionPublicKey: identity.encryptionPublicKey,
    signingPublicKey: identity.signingPublicKey,
    createdAt: identity.createdAt,
  };
}

function parseIdentity(value: string): HospitalIdentity {
  const identity = JSON.parse(value) as Partial<HospitalIdentity>;
  if (
    identity.version !== 1 || !identity.keyId ||
    !identity.encryptionPublicKey || !identity.encryptionSecretKey ||
    !identity.signingPublicKey || !identity.signingSecretKey ||
    typeof identity.createdAt !== 'number'
  ) throw new Error('Hospital identity in secure storage is corrupted.');
  return identity as HospitalIdentity;
}
