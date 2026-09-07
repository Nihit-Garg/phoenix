import * as SecureStore from 'expo-secure-store';
import { crypto_box_keypair, crypto_sign_keypair } from 'react-native-libsodium';

const CIVILIAN_IDENTITY_KEY = 'mirage.civilian.identity.v1';

export interface CivilianIdentity {
  version: 1;
  encryptionPublicKey: string;
  encryptionSecretKey: string;
  signingPublicKey: string;
  signingSecretKey: string;
  createdAt: number;
}

export async function getOrCreateCivilianIdentity(): Promise<CivilianIdentity> {
  const stored = await SecureStore.getItemAsync(CIVILIAN_IDENTITY_KEY);
  if (stored) return parseIdentity(stored);

  const encryption = crypto_box_keypair('base64');
  const signing = crypto_sign_keypair('base64');
  const identity: CivilianIdentity = {
    version: 1,
    encryptionPublicKey: encryption.publicKey,
    encryptionSecretKey: encryption.privateKey,
    signingPublicKey: signing.publicKey,
    signingSecretKey: signing.privateKey,
    createdAt: Date.now(),
  };
  await SecureStore.setItemAsync(CIVILIAN_IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

function parseIdentity(value: string): CivilianIdentity {
  const identity = JSON.parse(value) as Partial<CivilianIdentity>;
  if (
    identity.version !== 1 ||
    !identity.encryptionPublicKey || !identity.encryptionSecretKey ||
    !identity.signingPublicKey || !identity.signingSecretKey ||
    typeof identity.createdAt !== 'number'
  ) throw new Error('Civilian identity in secure storage is corrupted.');
  return identity as CivilianIdentity;
}
