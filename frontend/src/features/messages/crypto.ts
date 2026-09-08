import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { crypto_box_seal, crypto_box_seal_open, crypto_sign_detached, crypto_sign_verify_detached, from_base64, to_base64 } from 'react-native-libsodium';
import { CivilianIdentity } from '../../core/security/identity';
import { MiragePacket } from '../../../../backend/src/protocol/messages';
import { envelopeSigningPayload } from '../../../../backend/src/protocol/envelope';
import { DEFAULT_MAX_HOPS } from '../../../../backend/src/mesh/routing';
import { ChatDependencies } from './ChatService';
import { CHAT_LIMITS, ChatState, Contact, emptyChatState, parseChatPayload, validName } from './model';

export function normalizeContact(value: Contact): Contact {
  const key = (raw: string) => {
    if (typeof raw !== 'string' || raw.length > 64) throw new Error('Invalid friend key.');
    const decoded = from_base64(raw);
    if (decoded.length !== 32) throw new Error('Invalid friend key.');
    return to_base64(decoded);
  };
  return { name: validName(value.name), encryptionPublicKey: key(value.encryptionPublicKey), signingPublicKey: key(value.signingPublicKey) };
}

export function friendCard(identity: CivilianIdentity, name: string): string {
  const contact = normalizeContact({ name, encryptionPublicKey: identity.encryptionPublicKey, signingPublicKey: identity.signingPublicKey });
  return JSON.stringify({ version: 1, contact, signature: crypto_sign_detached(JSON.stringify(contact), from_base64(identity.signingSecretKey), 'base64') });
}

export function parseFriendCard(text: string): Contact {
  try {
    if (text.length > 2048) throw new Error();
    const card = JSON.parse(text.trim());
    if (card.version !== 1) throw new Error();
    const contact = normalizeContact(card.contact);
    if (!crypto_sign_verify_detached(from_base64(card.signature), JSON.stringify(contact), from_base64(contact.signingPublicKey))) throw new Error();
    return contact;
  } catch { throw new Error('This friend card is invalid. Ask your friend to share it again.'); }
}

/** Compare in person; names alone are not identities. No private material is displayed. */
export async function contactFingerprint(contact: Contact): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${contact.encryptionPublicKey}:${contact.signingPublicKey}`);
  return hash.slice(0, 24).toUpperCase().match(/.{1,4}/g)!.join(' ');
}

export function chatDependencies(identity: CivilianIdentity): ChatDependencies {
  const storageKey = `mirage.chat.v1.${identity.encryptionPublicKey}`;
  const publicKey = from_base64(identity.encryptionPublicKey);
  const secretKey = from_base64(identity.encryptionSecretKey);
  return {
    selfId: identity.encryptionPublicKey,
    uuid: Crypto.randomUUID,
    now: Date.now,
    async load() {
      const ciphertext = await AsyncStorage.getItem(storageKey);
      if (!ciphertext) return emptyChatState();
      try {
        const state = JSON.parse(crypto_box_seal_open(from_base64(ciphertext), publicKey, secretKey, 'text')) as ChatState;
        if (state.version !== 1 || typeof state.name !== 'string' || !Array.isArray(state.friends) || !Array.isArray(state.messages) || !Array.isArray(state.outbox) || !Array.isArray(state.received)) throw new Error();
        return state;
      } catch { throw new Error('Saved chats could not be opened. Your saved data has been kept unchanged.'); }
    },
    async save(state) {
      // Only encrypted ciphertext goes into AsyncStorage; private keys stay in SecureStore.
      await AsyncStorage.setItem(storageKey, crypto_box_seal(JSON.stringify(state), publicKey, 'base64'));
    },
    seal(to, payload) {
      const unsigned = {
        version: 1 as const, envelopeId: Crypto.randomUUID(), recipientKeyId: to.encryptionPublicKey,
        senderEncryptionPublicKey: identity.encryptionPublicKey, senderSigningPublicKey: identity.signingPublicKey,
        ciphertext: crypto_box_seal(JSON.stringify(payload), from_base64(to.encryptionPublicKey), 'base64'),
        createdAt: Date.now(), kind: 'p2p' as const, to: to.encryptionPublicKey, priority: 'normal' as const,
        hops: 0, maxHops: DEFAULT_MAX_HOPS, path: [],
      };
      return { ...unsigned, signature: crypto_sign_detached(envelopeSigningPayload(unsigned), from_base64(identity.signingSecretKey), 'base64') };
    },
    open(packet: MiragePacket) {
      if (packet.version !== 1 || packet.kind !== 'p2p' || packet.to !== identity.encryptionPublicKey || packet.recipientKeyId !== identity.encryptionPublicKey
        || typeof packet.ciphertext !== 'string' || packet.ciphertext.length > (CHAT_LIMITS.text * 8 + 2048)) throw new Error('Invalid chat envelope.');
      const from = normalizeContact({ name: 'Incoming request', encryptionPublicKey: packet.senderEncryptionPublicKey, signingPublicKey: packet.senderSigningPublicKey });
      const { signature, ...unsigned } = packet;
      if (!crypto_sign_verify_detached(from_base64(signature), envelopeSigningPayload(unsigned), from_base64(from.signingPublicKey))) throw new Error('Invalid chat signature.');
      const raw = crypto_box_seal_open(from_base64(packet.ciphertext), publicKey, secretKey, 'text');
      return { from, payload: parseChatPayload(raw) };
    },
  };
}
