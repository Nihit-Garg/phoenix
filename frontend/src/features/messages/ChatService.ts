import type { MeshEngine, MeshEvent } from '../../../../backend/src/mesh/engine';
import type { MiragePacket } from '../../../../backend/src/protocol/messages';
import { CHAT_LIMITS, ChatBody, ChatPayload, ChatState, Contact, emptyChatState, validName } from './model';

export interface ChatDependencies {
  selfId: string;
  load(): Promise<ChatState>;
  save(state: ChatState): Promise<void>;
  seal(to: Contact, payload: ChatPayload): MiragePacket;
  open(packet: MiragePacket): { from: Contact; payload: ChatPayload };
  uuid(): string;
  now(): number;
}

/** Keeps chat reliability above the unchanged mesh. All mutations persist before publication. */
export class ChatService {
  private state = emptyChatState();
  private serial: Promise<unknown> = Promise.resolve();
  private loaded: Promise<void> = Promise.resolve();
  private unsubscribe?: () => void;
  private timer?: ReturnType<typeof setInterval>;
  private flushing = false;
  private running = false;
  private publish: (state: ChatState) => void = () => {};
  private report: (message: string) => void = () => {};

  constructor(private mesh: Pick<MeshEngine, 'send' | 'subscribe'>, private deps: ChatDependencies) {}

  start(publish: (state: ChatState) => void, report: (message: string) => void): () => void {
    this.running = true;
    this.publish = publish;
    this.report = report;
    this.loaded = this.deps.load().then((state) => { this.state = state; if (this.running) publish(state); });
    this.unsubscribe = this.mesh.subscribe((event) => {
      if (event.disposition === 'delivered' && event.packet?.kind === 'p2p') {
        void this.receive(event).catch((error) => this.error(error));
      }
    });
    this.timer = setInterval(() => { void this.flush().catch((error) => this.error(error)); }, CHAT_LIMITS.retryMs);
    void this.loaded.then(() => this.flush()).catch((error) => this.error(error));
    return () => { this.running = false; this.unsubscribe?.(); clearInterval(this.timer); };
  }

  private error(error: unknown): void {
    if (this.running) this.report(error instanceof Error ? error.message : 'Messaging is temporarily unavailable.');
  }

  private mutate(fn: (state: ChatState) => void): Promise<void> {
    const operation = this.serial.then(async () => {
      await this.loaded;
      const next: ChatState = JSON.parse(JSON.stringify(this.state));
      fn(next);
      await this.deps.save(next);
      this.state = next;
      if (this.running) this.publish(next);
    });
    this.serial = operation.catch(() => {});
    return operation;
  }

  private payload(body: ChatBody): ChatPayload {
    return { ...body, version: 1, id: this.deps.uuid(), sentAt: this.deps.now() };
  }

  private enqueue(state: ChatState, to: Contact, payload: ChatPayload): void {
    if (state.outbox.some((item) => item.payload.id === payload.id)) return;
    if (state.outbox.length >= CHAT_LIMITS.outbox) throw new Error('Too many pending messages. Wait for delivery before sending more.');
    state.outbox.push({ to, payload, attempts: 0, nextAttemptAt: this.deps.now(), expiresAt: this.deps.now() + CHAT_LIMITS.expiryMs });
  }

  async setName(name: string): Promise<void> {
    await this.mutate((state) => { state.name = validName(name); });
  }

  async addFriend(contact: Contact): Promise<void> {
    await this.mutate((state) => {
      const name = validName(state.name);
      if (contact.encryptionPublicKey === this.deps.selfId) throw new Error('That is your own friend card.');
      if (state.friends.some((f) => f.encryptionPublicKey === contact.encryptionPublicKey)) throw new Error('This person is already in your friend list or requests.');
      if (state.friends.length >= CHAT_LIMITS.friends) throw new Error('Your friend list is full.');
      const payload = this.payload({ type: 'friend-request', name });
      state.friends.push({ ...contact, name: validName(contact.name), status: 'outgoing', requestId: payload.id });
      this.enqueue(state, contact, payload);
    });
    void this.flush().catch((error) => this.error(error));
  }

  async respond(friendId: string, accept: boolean): Promise<void> {
    await this.mutate((state) => {
      const friend = state.friends.find((f) => f.encryptionPublicKey === friendId);
      if (!friend || friend.status !== 'incoming') throw new Error('This request is no longer pending.');
      const name = validName(state.name);
      friend.status = accept ? 'accepted' : 'blocked';
      this.enqueue(state, friend, this.payload(accept
        ? { type: 'friend-accept', name, requestId: friend.requestId }
        : { type: 'friend-decline', requestId: friend.requestId }));
    });
    void this.flush().catch((error) => this.error(error));
  }

  async sendMessage(friendId: string, text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > CHAT_LIMITS.text) throw new Error(`Messages must contain 1–${CHAT_LIMITS.text} characters.`);
    await this.mutate((state) => {
      const friend = state.friends.find((f) => f.encryptionPublicKey === friendId && f.status === 'accepted');
      if (!friend) throw new Error('Wait until your friend accepts the request.');
      if (state.messages.length >= CHAT_LIMITS.messages) throw new Error('Chat storage is full. Clear a conversation first.');
      const payload = this.payload({ type: 'message', text: trimmed });
      state.messages.push({ id: payload.id, friendId, text: trimmed, direction: 'out', sentAt: payload.sentAt, read: true, status: 'queued' });
      this.enqueue(state, friend, payload);
    });
    void this.flush().catch((error) => this.error(error));
  }

  async markRead(friendId: string): Promise<void> {
    await this.loaded;
    if (!this.state.messages.some((m) => m.friendId === friendId && !m.read)) return;
    await this.mutate((state) => { state.messages.filter((m) => m.friendId === friendId).forEach((m) => { m.read = true; }); });
  }

  async clearConversation(friendId: string): Promise<void> {
    await this.mutate((state) => {
      state.messages = state.messages.filter((m) => m.friendId !== friendId);
      state.outbox = state.outbox.filter((m) => m.to.encryptionPublicKey !== friendId || m.payload.type !== 'message');
    });
  }

  async retry(friendId: string): Promise<void> {
    await this.mutate((state) => {
      const friend = state.friends.find((f) => f.encryptionPublicKey === friendId);
      if (!friend || friend.status === 'blocked' || friend.status === 'declined') throw new Error('This contact cannot receive messages.');
      for (const item of state.outbox.filter((o) => o.to.encryptionPublicKey === friendId)) {
        item.nextAttemptAt = this.deps.now(); item.expiresAt = this.deps.now() + CHAT_LIMITS.expiryMs;
      }
      for (const message of state.messages.filter((m) => m.friendId === friendId && m.direction === 'out' && m.status === 'failed')) {
        this.enqueue(state, friend, { version: 1, id: message.id, type: 'message', text: message.text, sentAt: message.sentAt });
        message.status = 'queued';
      }
      if (friend.status === 'outgoing' && !state.outbox.some((o) => o.payload.id === friend.requestId)) {
        this.enqueue(state, friend, { version: 1, id: friend.requestId, sentAt: this.deps.now(), type: 'friend-request', name: validName(state.name) });
      }
    });
    void this.flush().catch((error) => this.error(error));
  }

  async flush(): Promise<void> {
    await this.loaded;
    if (!this.running || this.flushing) return;
    this.flushing = true;
    try {
      for (const item of [...this.state.outbox]) {
        if (!this.running) break;
        if (item.expiresAt <= this.deps.now()) {
          await this.mutate((state) => {
            state.outbox = state.outbox.filter((o) => o.payload.id !== item.payload.id);
            const message = state.messages.find((m) => m.id === item.payload.id && m.direction === 'out');
            if (message && message.status !== 'delivered') message.status = 'failed';
          });
          continue;
        }
        if (item.nextAttemptAt > this.deps.now() || !this.state.outbox.some((o) => o.payload.id === item.payload.id)) continue;
        let sent = false;
        try {
          // A fresh envelope permits retry across existing relay dedupe caches.
          // The stable, encrypted payload ID deduplicates the conversation itself.
          await this.mesh.send(this.deps.seal(item.to, item.payload));
          sent = true;
        } catch { /* Keep the saved outbox entry until a route becomes available. */ }
        await this.mutate((state) => {
          const pending = state.outbox.find((o) => o.payload.id === item.payload.id);
          if (!pending) return; // A receipt can arrive before mesh.send resolves.
          pending.attempts++;
          pending.nextAttemptAt = this.deps.now() + Math.min(CHAT_LIMITS.maxRetryMs, CHAT_LIMITS.retryMs * 2 ** Math.min(pending.attempts, 2));
          const message = state.messages.find((m) => m.id === item.payload.id && m.direction === 'out');
          if (message && message.status !== 'delivered') message.status = sent ? 'sent' : 'queued';
        });
      }
    } finally { this.flushing = false; }
  }

  private async receive(event: MeshEvent): Promise<void> {
    let decoded: ReturnType<ChatDependencies['open']>;
    try { decoded = this.deps.open(event.packet!); } catch { return; }
    const { from, payload } = decoded;
    if (from.encryptionPublicKey === this.deps.selfId) return;
    let acknowledge = false;
    await this.mutate((state) => {
      let friend = state.friends.find((f) => f.encryptionPublicKey === from.encryptionPublicKey);
      if (friend && friend.signingPublicKey !== from.signingPublicKey) return;
      if (payload.type === 'receipt') {
        if (!friend) return;
        const item = state.outbox.find((o) => o.payload.id === payload.messageId && o.to.encryptionPublicKey === from.encryptionPublicKey);
        const message = state.messages.find((m) => m.id === payload.messageId && m.friendId === from.encryptionPublicKey && m.direction === 'out');
        if (!item && !message) return;
        state.outbox = state.outbox.filter((o) => o !== item);
        if (message) message.status = 'delivered';
        return;
      }
      if (payload.type === 'friend-request') {
        if (friend?.status === 'blocked' || friend?.status === 'declined') return;
        if (!friend) {
          if (state.friends.length >= CHAT_LIMITS.friends) return;
          friend = { ...from, name: payload.name, status: 'incoming', requestId: payload.id };
          state.friends.push(friend);
        }
        // Crossed requests express consent on both sides; return acceptance.
        if (friend.status === 'outgoing' || friend.status === 'accepted') {
          friend.status = 'accepted';
          if (!state.outbox.some((o) => o.to.encryptionPublicKey === from.encryptionPublicKey && o.payload.type === 'friend-accept' && o.payload.requestId === payload.id)) {
            this.enqueue(state, friend, this.payload({ type: 'friend-accept', name: validName(state.name), requestId: payload.id }));
          }
        }
        acknowledge = true;
        return;
      }
      if (!friend) return;
      if (payload.type === 'friend-accept' || payload.type === 'friend-decline') {
        if (friend.requestId !== payload.requestId || !['outgoing', 'accepted', 'declined'].includes(friend.status)) return;
        if (friend.status === 'outgoing') {
          friend.status = payload.type === 'friend-accept' ? 'accepted' : 'declined';
          if (payload.type === 'friend-accept') friend.name = payload.name;
        }
        state.outbox = state.outbox.filter((o) => o.payload.id !== friend!.requestId);
        acknowledge = true;
        return;
      }
      if (payload.type === 'message' && friend.status === 'accepted') {
        if (!state.received.some((m) => m.id === payload.id && m.friendId === from.encryptionPublicKey)) {
          if (state.messages.length >= CHAT_LIMITS.messages) throw new Error('Chat storage is full. Clear a conversation to receive more messages.');
          state.messages.push({ id: payload.id, friendId: from.encryptionPublicKey, text: payload.text, direction: 'in',
            sentAt: payload.sentAt, receivedAt: this.deps.now(), read: false, status: 'delivered' });
          state.received.push({ id: payload.id, friendId: from.encryptionPublicKey });
          state.received = state.received.slice(-CHAT_LIMITS.messages * 2);
        }
        acknowledge = true;
      }
    });
    if (acknowledge && this.running) {
      // Receipt only follows successful durable storage. A duplicate retry gets
      // a new receipt if the original return path was unavailable.
      try { await this.mesh.send(this.deps.seal(from, this.payload({ type: 'receipt', messageId: payload.id }))); } catch { /* Sender retries. */ }
    }
    void this.flush().catch((error) => this.error(error));
  }
}
