import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';
import { randomUUID, createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const cache = new Map();
const nativeMocks = new Map();
function load(relative) {
  const file = resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (nativeMocks.has(name)) return nativeMocks.get(name);
    const target = resolve(dirname(file), name + '.ts');
    if (existsSync(target)) return load(target);
    throw new Error(`Unexpected dependency: ${name}`);
  }, setInterval, clearInterval, Date, TextEncoder, TextDecoder });
  return exports;
}
const { ChatService } = load('frontend/src/features/messages/ChatService.ts');
const { emptyChatState, parseChatPayload, CHAT_LIMITS } = load('frontend/src/features/messages/model.ts');
const { MeshEngine } = load('backend/src/mesh/engine.ts');
const clone = (value) => JSON.parse(JSON.stringify(value));
const pause = () => new Promise((resolve) => setImmediate(resolve));
async function until(check, message = 'condition timed out') {
  for (let i = 0; i < 150; i++) { if (check()) return; await pause(); }
  assert.ok(check(), message);
}

// Real mesh/routing with deterministic links. Only native crypto and disk are
// replaced; separate adapter tests below exercise crypto call boundaries.
function setup(t, relay = false) {
  const devices = new Map();
  let sequence = 0;
  let now = 1_000_000;
  const deliveries = [];
  const droppedReceipts = new Set();
  const links = new Map([['alice', relay ? ['relay'] : ['bob']], ['bob', relay ? ['relay'] : ['alice']], ['relay', ['alice', 'bob']]]);
  function device(id) {
    const listeners = new Set();
    const transport = {
      subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
      async broadcast(bytes, except) {
        if (!current.online) throw new Error('Offline');
        const destinations = (links.get(id) ?? []).filter((other) => other !== except && devices.get(other)?.online);
        if (!destinations.length) throw new Error('No route');
        const packet = JSON.parse(new TextDecoder().decode(bytes));
        for (const other of destinations) {
          if (packet.ciphertext && JSON.parse(packet.ciphertext).type === 'receipt' && droppedReceipts.has(packet.to)) continue;
          deliveries.push({ from: id, to: other, packet });
          for (const fn of devices.get(other).listeners) fn({ type: 'message', message: { from: { peerId: id }, bytes, receivedAt: now } });
        }
      },
    };
    const mesh = new MeshEngine(id, null, transport);
    mesh.start();
    const current = { id, online: true, listeners, mesh, disk: emptyChatState(), state: null, errors: [], stop: () => {}, service: null };
    devices.set(id, current);
    current.contact = { name: id, encryptionPublicKey: id, signingPublicKey: `${id}-sign` };
    current.start = () => {
      current.service = new ChatService(mesh, {
        selfId: id, uuid: () => `id-${++sequence}`, now: () => now,
        load: async () => clone(current.disk),
        save: async (state) => { await pause(); if (current.failSave) throw new Error('Storage failed'); current.disk = clone(state); },
        seal: (to, payload) => ({ version: 1, envelopeId: `envelope-${++sequence}`, recipientKeyId: to.encryptionPublicKey,
          senderEncryptionPublicKey: id, senderSigningPublicKey: `${id}-sign`, ciphertext: JSON.stringify(payload), signature: 'test-signature',
          createdAt: now, hops: 0, maxHops: 3, path: [], kind: 'p2p', to: to.encryptionPublicKey, priority: 'normal' }),
        open: (packet) => ({ from: { name: packet.senderEncryptionPublicKey, encryptionPublicKey: packet.senderEncryptionPublicKey, signingPublicKey: packet.senderSigningPublicKey }, payload: parseChatPayload(packet.ciphertext) }),
      });
      current.stop = current.service.start((state) => { current.state = state; }, (error) => current.errors.push(error));
    };
    current.start();
    return current;
  }
  const alice = device('alice'); const bob = device('bob');
  if (relay) device('relay');
  t.after(() => { for (const d of devices.values()) { d.stop(); d.mesh.stop(); } });
  return { alice, bob, devices, deliveries, droppedReceipts, advance: (ms = 120_000) => { now += ms; } };
}

async function friends(h) {
  await h.alice.service.setName('Alice'); await h.bob.service.setName('Bob');
  await h.alice.service.addFriend(h.bob.contact);
  await until(() => h.bob.state?.friends[0]?.status === 'incoming');
  await h.bob.service.respond('alice', true);
  await until(() => h.alice.state?.friends[0]?.status === 'accepted');
  await until(() => !h.bob.state.outbox.length && !h.alice.state.outbox.length);
}

test('mutual acceptance enables bidirectional chat over an unchanged one-hop mesh', async (t) => {
  const h = setup(t, true);
  await friends(h);
  await h.alice.service.sendMessage('bob', 'Hello Bob');
  await h.bob.service.sendMessage('alice', 'Hello Alice');
  await until(() => h.alice.state.messages.length === 2 && h.bob.state.messages.length === 2);
  await until(() => h.alice.state.messages.every((m) => m.status === 'delivered') && h.bob.state.messages.every((m) => m.status === 'delivered'));
  assert.ok(h.deliveries.some((d) => d.to === 'bob' && d.packet.hops === 1 && JSON.parse(d.packet.ciphertext).type === 'message'));
  assert.equal(h.bob.state.messages.find((m) => m.direction === 'in').read, false);
  await h.bob.service.markRead('alice');
  assert.ok(h.bob.state.messages.every((m) => m.read));
});

test('lost receipt retries with fresh routing IDs but one bubble; clear retains duplicate protection', async (t) => {
  const h = setup(t, true); await friends(h);
  h.droppedReceipts.add('alice');
  await h.alice.service.sendMessage('bob', 'Exactly once');
  await until(() => h.bob.state.messages.length === 1 && h.alice.state.messages[0]?.status === 'sent');
  await h.bob.service.clearConversation('alice');
  h.droppedReceipts.clear(); h.advance(); await h.alice.service.flush();
  await until(() => h.alice.state.messages[0]?.status === 'delivered');
  assert.equal(h.bob.state.messages.length, 0);
  const transmissions = h.deliveries.filter((d) => d.from === 'alice' && JSON.parse(d.packet.ciphertext).type === 'message');
  assert.ok(new Set(transmissions.map((d) => d.packet.envelopeId)).size >= 2);
  assert.equal(new Set(transmissions.map((d) => JSON.parse(d.packet.ciphertext).id)).size, 1);
});

test('queued messages and friendships survive service restart and reconnect', async (t) => {
  const h = setup(t); await friends(h);
  h.bob.online = false;
  await h.alice.service.sendMessage('bob', 'Saved offline');
  await until(() => h.alice.state.outbox[0]?.attempts > 0);
  h.alice.stop(); h.alice.start(); h.advance(); h.bob.online = true;
  await h.alice.service.flush();
  await until(() => h.bob.state.messages.length === 1 && h.alice.state.messages[0]?.status === 'delivered');
  assert.equal(h.bob.state.messages[0].text, 'Saved offline');
});

test('cannot message strangers or pending requests; decline remains closed', async (t) => {
  const h = setup(t);
  await h.alice.service.setName('Alice'); await h.bob.service.setName('Bob');
  await assert.rejects(h.alice.service.sendMessage('bob', 'stranger'));
  await h.alice.service.addFriend(h.bob.contact);
  await until(() => h.bob.state?.friends.length === 1);
  await assert.rejects(h.alice.service.sendMessage('bob', 'pending'));
  await h.bob.service.respond('alice', false);
  await until(() => h.alice.state.friends[0].status === 'declined');
  await assert.rejects(h.alice.service.sendMessage('bob', 'declined'));
});

test('simultaneous requests converge to one accepted friendship', async (t) => {
  const h = setup(t);
  await h.alice.service.setName('Alice'); await h.bob.service.setName('Bob');
  await Promise.all([h.alice.service.addFriend(h.bob.contact), h.bob.service.addFriend(h.alice.contact)]);
  await until(() => h.alice.state.friends[0]?.status === 'accepted' && h.bob.state.friends[0]?.status === 'accepted');
  assert.equal(h.alice.state.friends.length, 1); assert.equal(h.bob.state.friends.length, 1);
});

test('concurrent sends and receipts cannot overwrite delivered state or lose texts', async (t) => {
  const h = setup(t); await friends(h);
  await Promise.all(Array.from({ length: 8 }, (_, i) => h.alice.service.sendMessage('bob', `Text ${i}`)));
  for (let i = 0; i < 10; i++) { await h.alice.service.flush(); await pause(); }
  await until(() => h.alice.state.messages.length === 8 && h.alice.state.messages.every((m) => m.status === 'delivered'));
  assert.equal(h.bob.state.messages.length, 8);
});

test('failed disk save sends no receipt, allowing later recovery', async (t) => {
  const h = setup(t); await friends(h); h.bob.failSave = true;
  await h.alice.service.sendMessage('bob', 'Keep trying');
  await until(() => h.bob.errors.length > 0);
  assert.equal(h.bob.state.messages.length, 0);
  assert.notEqual(h.alice.state.messages[0].status, 'delivered');
  h.bob.failSave = false; h.advance(); await h.alice.service.flush();
  await until(() => h.alice.state.messages[0].status === 'delivered');
});

test('outgoing messages expire honestly and can be retried', async (t) => {
  const h = setup(t); await friends(h); h.bob.online = false;
  await h.alice.service.sendMessage('bob', 'Late arrival');
  await until(() => h.alice.state.outbox[0]?.attempts > 0);
  h.advance(CHAT_LIMITS.expiryMs + 1); await h.alice.service.flush();
  assert.equal(h.alice.state.messages[0].status, 'failed');
  h.bob.online = true; await h.alice.service.retry('bob');
  await until(() => h.alice.state.messages[0].status === 'delivered');
});

test('chat payload validation rejects oversized, blank, malformed and unknown messages', () => {
  const base = { version: 1, id: 'example', sentAt: 10, type: 'message', text: 'hello' };
  assert.equal(parseChatPayload(JSON.stringify(base)).text, 'hello');
  for (const patch of [{ text: '' }, { text: 'x'.repeat(CHAT_LIMITS.text + 1) }, { type: 'unknown' }, { id: {} }, { sentAt: null }, { version: 9 }]) {
    assert.throws(() => parseChatPayload(JSON.stringify({ ...base, ...patch })));
  }
});

// Exercise actual libsodium primitives through its installed Node/WASM adapter.
// Android JSI bindings still require the physical-phone acceptance run.
const sodium = require('react-native-libsodium');
await sodium.ready;
const encryptedDisk = new Map();
nativeMocks.set('react-native-libsodium', sodium);
nativeMocks.set('@react-native-async-storage/async-storage', { __esModule: true, default: {
  getItem: async (key) => encryptedDisk.get(key) ?? null,
  setItem: async (key, value) => { encryptedDisk.set(key, value); },
} });
nativeMocks.set('expo-crypto', { randomUUID, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_algorithm, input) => createHash('sha256').update(input).digest('hex') });
const crypto = load('frontend/src/features/messages/crypto.ts');
function identity() {
  const box = sodium.crypto_box_keypair('base64'); const sign = sodium.crypto_sign_keypair('base64');
  return { version: 1, encryptionPublicKey: box.publicKey, encryptionSecretKey: box.privateKey, signingPublicKey: sign.publicKey, signingSecretKey: sign.privateKey, createdAt: Date.now() };
}

test('real sealed-box chat roundtrip, signatures, wrong recipient and tampering', () => {
  const alice = identity(); const bob = identity(); const eve = identity();
  const a = crypto.chatDependencies(alice); const b = crypto.chatDependencies(bob);
  const payload = { version: 1, id: randomUUID(), sentAt: Date.now(), type: 'message', text: 'नमस्ते 👋 "hello"\n'.repeat(50) };
  const packet = a.seal({ ...bob, name: 'Bob' }, payload);
  assert.equal(b.open(packet).payload.text, payload.text);
  assert.ok(!packet.ciphertext.includes('hello'));
  assert.throws(() => crypto.chatDependencies(eve).open(packet));
  assert.throws(() => b.open({ ...packet, senderSigningPublicKey: eve.signingPublicKey }));
  assert.throws(() => b.open({ ...packet, signature: sodium.to_base64(new Uint8Array(64)) }));
  assert.throws(() => b.open({ ...packet, ciphertext: packet.ciphertext.slice(1) }));
});

test('friend cards are signed, public-only and reject altered names or keys', async () => {
  const person = identity();
  const card = crypto.friendCard(person, 'Alice');
  assert.ok(!card.includes(person.encryptionSecretKey) && !card.includes(person.signingSecretKey));
  assert.equal(crypto.parseFriendCard(card).name, 'Alice');
  const altered = JSON.parse(card); altered.contact.name = 'Someone else';
  assert.throws(() => crypto.parseFriendCard(JSON.stringify(altered)));
  assert.throws(() => crypto.parseFriendCard('{}'));
  const code = await crypto.contactFingerprint(crypto.parseFriendCard(card));
  assert.match(code, /^[A-F0-9]{4}( [A-F0-9]{4}){5}$/);
});

test('friends, plaintext history and outbox are encrypted on disk and restored', async () => {
  const person = identity(); const deps = crypto.chatDependencies(person);
  const state = emptyChatState(); state.name = 'Private name';
  state.messages.push({ id: 'saved', friendId: 'bob', text: 'Private conversation', direction: 'in', sentAt: Date.now(), read: false, status: 'delivered' });
  await deps.save(state);
  const key = `mirage.chat.v1.${person.encryptionPublicKey}`;
  const stored = encryptedDisk.get(key);
  assert.ok(!stored.includes('Private') && !stored.includes('messages'));
  assert.equal((await deps.load()).messages[0].text, 'Private conversation');
  encryptedDisk.set(key, stored.slice(1));
  await assert.rejects(deps.load());
  assert.equal(encryptedDisk.get(key), stored.slice(1), 'corrupt data is not silently overwritten');
});
