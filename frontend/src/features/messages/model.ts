/** Application protocol carried inside existing encrypted `p2p` envelopes. */
export const CHAT_LIMITS = {
  text: 2000, name: 60, friends: 100, messages: 2000, outbox: 200,
  retryMs: 15_000, expiryMs: 24 * 60 * 60 * 1000, maxRetryMs: 60_000,
} as const;

export interface Contact { name: string; encryptionPublicKey: string; signingPublicKey: string; }
export interface Friend extends Contact {
  status: 'incoming' | 'outgoing' | 'accepted' | 'blocked' | 'declined';
  requestId: string;
}
export type ChatBody =
  | { type: 'friend-request'; name: string }
  | { type: 'friend-accept'; name: string; requestId: string }
  | { type: 'friend-decline'; requestId: string }
  | { type: 'message'; text: string }
  | { type: 'receipt'; messageId: string };
export type ChatPayload = ChatBody & { version: 1; id: string; sentAt: number };
export interface ChatMessage {
  id: string; friendId: string; text: string; direction: 'in' | 'out';
  sentAt: number; receivedAt?: number; read: boolean;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
}
export interface Outbound {
  to: Contact; payload: ChatPayload; attempts: number; nextAttemptAt: number; expiresAt: number;
}
export interface ChatState {
  version: 1; name: string; friends: Friend[]; messages: ChatMessage[]; outbox: Outbound[];
  received: Array<{ id: string; friendId: string }>;
}
export const emptyChatState = (): ChatState => ({ version: 1, name: '', friends: [], messages: [], outbox: [], received: [] });

export function validName(value: string): string {
  const name = value.trim();
  if (!name || name.length > CHAT_LIMITS.name) throw new Error(`Enter a name of 1–${CHAT_LIMITS.name} characters.`);
  return name;
}

export function parseChatPayload(raw: string): ChatPayload {
  if (raw.length > CHAT_LIMITS.text * 6 + 1024) throw new Error('Message is too large.');
  const body = JSON.parse(raw);
  if (!body || body.version !== 1 || typeof body.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(body.id)
    || !Number.isFinite(body.sentAt) || body.sentAt <= 0 || body.sentAt > 8.64e15) throw new Error('Invalid message.');
  const validId = (id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  switch (body.type) {
    case 'friend-request': validName(body.name); break;
    case 'friend-accept': validName(body.name); if (!validId(body.requestId)) throw new Error('Invalid request.'); break;
    case 'friend-decline': if (!validId(body.requestId)) throw new Error('Invalid request.'); break;
    case 'message': if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > CHAT_LIMITS.text) throw new Error('Invalid text.'); break;
    case 'receipt': if (!validId(body.messageId)) throw new Error('Invalid receipt.'); break;
    default: throw new Error('Unsupported message.');
  }
  return body as ChatPayload;
}
