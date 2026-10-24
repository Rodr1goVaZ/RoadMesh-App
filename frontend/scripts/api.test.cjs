const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function client(session, fetch) {
  const modules = {
    './session': { session },
    './config': { API_BASE: 'http://isolated-test/api' },
    './auth-events': { authEvents: { emit: () => assert.fail('Unexpected authentication event') } },
  };
  const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../src/api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => modules[name], fetch, FormData, JSON, Error });
  return exports.api;
}

for (const route of ['/auth/forgot-password', '/auth/reset-password']) {
  test(`${route} works independently of an expired or unavailable session`, async () => {
    const api = client({
      getFreshToken: () => assert.fail('Recovery must not try to renew an old session'),
      getSupport: () => assert.fail('Recovery must not use a support session'),
    }, async (url, options) => {
      assert.equal(url, 'http://isolated-test/api' + route);
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers['X-Support-Token'], undefined);
      return { ok: true, text: async () => JSON.stringify({ message: 'ok' }) };
    });
    assert.equal((await api.post(route, { email: 'test@example.invalid' })).message, 'ok');
  });
}

test('private requests continue to use the authenticated account and support scope', async () => {
  const api = client({ getFreshToken: async () => 'test-account-token', getSupport: async () => ({ token: 'test-support-token' }) },
    async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-account-token');
      assert.equal(options.headers['X-Support-Token'], 'test-support-token');
      return { ok: true, text: async () => '{}' };
    });
  await api.get('/dashboard');
});

test('network failure shows an actionable message without exposing browser internals', async () => {
  const api = client({}, async () => { throw new TypeError('Load failed'); });
  await assert.rejects(api.post('/auth/login', {}), /Não foi possível contactar o servidor/);
});

test('server failure is distinguished from invalid login credentials', async () => {
  const api = client({}, async () => ({ ok: false, status: 500, text: async () => 'FUNCTION_INVOCATION_FAILED' }));
  await assert.rejects(api.post('/auth/login', {}), /servidor está temporariamente indisponível/);
  const invalid = client({}, async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ detail: 'Credenciais inválidas' }) }));
  await assert.rejects(invalid.post('/auth/login', {}), /Credenciais inválidas/);
});
