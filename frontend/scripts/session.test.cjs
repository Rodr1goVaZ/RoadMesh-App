const { loadTypeScript } = require('./test-helpers.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');

function token(seconds) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url');
  return `header.${payload}.signature`;
}

function createSession(fetch) {
  const values = new Map();
  const events = [];
  const storage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
  const modules = {
    'react-native': { Platform: { OS: 'web' } },
    'expo-secure-store': {},
    '@react-native-async-storage/async-storage': storage,
    '@/src/core/config': { API_BASE: 'http://isolated-test/api' },
    '@/src/core/auth/events': { authEvents: { emit: status => events.push(status) } },
  };
  const { session } = loadTypeScript('../src/core/auth/session.ts', { modules, globals: { fetch, atob, Date, Promise } });
  return { session, events };
}

function response(accessToken) {
  return { ok: true, status: 200, json: async () => ({ access_token: accessToken }) };
}

test('valid access token needs no refresh request', async () => {
  const { session } = createSession(() => assert.fail('unexpected network request'));
  const valid = token(900);
  await session.saveToken(valid);
  assert.equal(await session.getFreshToken(), valid);
});

test('parallel callers share one renewal and persist the renewed token', async () => {
  let calls = 0;
  const renewed = token(900);
  const { session } = createSession(async () => { calls++; return response(renewed); });
  await session.saveToken(token(60));
  const results = await Promise.all(Array.from({ length: 8 }, () => session.getFreshToken()));
  assert.equal(calls, 1);
  assert.ok(results.every(value => value === renewed));
  assert.equal(await session.getToken(), renewed);
});

test('a refresh finishing after logout cannot restore the old session', async () => {
  let finish;
  const { session } = createSession(() => new Promise(resolve => { finish = resolve; }));
  await session.saveToken(token(60));
  const pending = session.getFreshToken();
  await new Promise(resolve => setImmediate(resolve));
  await session.clearToken();
  finish(response(token(900)));
  assert.equal(await pending, null);
  assert.equal(await session.getToken(), null);
});

test('a refresh finishing after another login cannot overwrite that login', async () => {
  let finish;
  const { session } = createSession(() => new Promise(resolve => { finish = resolve; }));
  await session.saveToken(token(60));
  const pending = session.getFreshToken();
  await new Promise(resolve => setImmediate(resolve));
  const otherLogin = token(800);
  await session.saveToken(otherLogin);
  finish(response(token(900)));
  assert.equal(await pending, otherLogin);
  assert.equal(await session.getToken(), otherLogin);
});

test('401 renewal rejection emits the authentication event', async () => {
  const { session, events } = createSession(async () => ({ ok: false, status: 401 }));
  await session.saveToken(token(60));
  await assert.rejects(session.getFreshToken(), /Sessão expirada/);
  assert.deepEqual(events, [401]);
});

test('network failure does not discard a stored token or emit a logout', async () => {
  const { session, events } = createSession(async () => { throw new Error('offline'); });
  const stored = token(60);
  await session.saveToken(stored);
  await assert.rejects(session.getFreshToken(), /offline/);
  assert.equal(await session.getToken(), stored);
  assert.deepEqual(events, []);
});
