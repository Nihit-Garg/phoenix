import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const script = readFileSync(resolve(root, 'frontend/scripts/provision-hospital-manifest.mjs'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const key = Buffer.alloc(32, 255);
const manifest = { version: 1, keyId: 'hospital-test', createdAt: 1234,
  encryptionPublicKey: key.toString('base64url'), signingPublicKey: key.toString('base64url') };

function provision(input) {
  let written;
  vm.runInNewContext(script, {
    process: { argv: ['node', 'provision', 'input.json'] },
    readFileSync: () => input, writeFileSync: (_path, contents) => { written = contents; },
    resolve: (...paths) => paths.join('/'), Buffer, console: { log() {} },
  });
  return JSON.parse(written.match(/ = (\{[\s\S]*\});/)[1]);
}

test('Hospital export Base64URL is preserved, including key ID', () => {
  assert.deepEqual(provision(JSON.stringify(manifest)), manifest);
});
test('traditional Base64 and a Windows BOM import into runtime Base64URL', () => {
  assert.deepEqual(provision('\uFEFF' + JSON.stringify({
    ...manifest, encryptionPublicKey: key.toString('base64'), signingPublicKey: key.toString('base64'),
  })), manifest);
});
test('extra private fields cannot be embedded in the Civilian APK', () => {
  assert.deepEqual(provision(JSON.stringify({ ...manifest, encryptionSecretKey: 'secret', signingSecretKey: 'secret' })), manifest);
});
test('malformed, wrong-length and noncanonical public keys are rejected', () => {
  for (const bad of ['', 'not-a-key', Buffer.alloc(31).toString('base64url'),
    manifest.encryptionPublicKey + '==', manifest.encryptionPublicKey.slice(0, -1) + '_',
    manifest.encryptionPublicKey.slice(0, 10) + ' ' + manifest.encryptionPublicKey.slice(10)]) {
    assert.throws(() => provision(JSON.stringify({ ...manifest, encryptionPublicKey: bad })));
  }
});

function transportHarness(app, version, allowFine = true) {
  const source = readFileSync(resolve(root, app, 'src/core/transport/NearbyConnectionsTransport.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const permissions = Object.fromEntries(['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION',
    'BLUETOOTH_ADVERTISE', 'BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN', 'NEARBY_WIFI_DEVICES'].map((p) => [p, p]));
  const granted = new Set();
  const requested = [];
  const listeners = new Map();
  let resume;
  let starts = 0;
  const native = {
    isSupported: () => true,
    start() { starts++; },
    stop() {},
    addListener(name, callback) { listeners.set(name, callback); return { remove() { listeners.delete(name); } }; },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: (name) => name === 'react-native' ? {
      Platform: { OS: 'android', Version: version },
      AppState: { addEventListener(_name, callback) { resume = callback; return { remove() { resume = undefined; } }; } },
      PermissionsAndroid: {
        PERMISSIONS: permissions,
        check: async (p) => granted.has(p),
        requestMultiple: async (ps) => {
          requested.push([...ps]);
          for (const p of ps) if (allowFine || p !== 'ACCESS_FINE_LOCATION') granted.add(p);
          return Object.fromEntries(ps.map((p) => [p, granted.has(p) ? 'granted' : 'denied']));
        },
      },
    } : { __esModule: true, default: native },
    setTimeout, clearTimeout, TextEncoder, TextDecoder,
  });
  const transport = new exports.NearbyConnectionsTransport('test');
  const events = [];
  transport.subscribe((event) => events.push(event));
  return { transport, granted, requested, listeners, events, get starts() { return starts; },
    resume: () => resume?.('active') };
}

for (const app of ['frontend', 'hospital']) {
  for (const version of [30, 31, 33, 36]) {
    test(`${app}: Android ${version} verifies precise location before starting Nearby`, async () => {
      const h = transportHarness(app, version);
      await h.transport.start();
      assert.equal(h.starts, 1);
      assert.ok(h.requested[0].includes('ACCESS_FINE_LOCATION'));
      assert.ok(h.requested[0].includes('ACCESS_COARSE_LOCATION'));
      assert.equal(h.requested[0].includes('BLUETOOTH_SCAN'), version >= 31);
      assert.equal(h.requested[0].includes('NEARBY_WIFI_DEVICES'), version >= 33);
      await h.transport.stop();
    });
  }
  test(`${app}: approximate-only permission blocks discovery, Settings return recovers`, async () => {
    const h = transportHarness(app, 36, false);
    await assert.rejects(h.transport.start(), /Precise location/);
    assert.equal(h.starts, 0);
    assert.ok(h.events.some((e) => e.status === 'unavailable'));
    h.granted.add('ACCESS_FINE_LOCATION');
    h.resume();
    await new Promise(setImmediate);
    assert.equal(h.starts, 1);
    assert.equal(h.requested.length, 1, 'Settings return checks permission without another prompt');
    h.listeners.get('onStatus')({ status: 'ready' });
    h.resume();
    await new Promise(setImmediate);
    assert.equal(h.starts, 1, 'healthy links are preserved on foreground');
    await h.transport.stop();
    h.resume();
    assert.equal(h.starts, 1, 'stopped transport cannot restart itself');
  });
  test(`${app}: native startup error is surfaced and retry keeps one subscription per event`, async () => {
    const h = transportHarness(app, 36);
    await h.transport.start();
    h.listeners.get('onError')({ message: '8036: MISSING_PERMISSION_ACCESS_FINE_LOCATION' });
    assert.ok(h.events.some((e) => e.status === 'unavailable'));
    await h.transport.start();
    assert.equal(h.starts, 2);
    assert.equal(h.listeners.size, 6);
    await h.transport.stop();
    assert.equal(h.listeners.size, 0);
  });
}
