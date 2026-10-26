const { loadTypeScript } = require('./test-helpers.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { companyModules, companyHome } = loadTypeScript('../src/core/auth/company-modules.ts');
test('existing companies keep the workshop entry point', () => {
  assert.equal(companyHome({}), '/(app)/inicio');
  assert.equal(companyModules({}).join(), 'workshop');
});
test('stand-only companies enter the stand with no workshop access flag', () => {
  assert.equal(companyHome({ modules: ['stand'] }), '/(stand)/stand-inicio');
  assert.equal(companyModules({ modules: ['stand'] }).includes('workshop'), false);
});
test('combined companies keep the workshop landing page and both modules', () => {
  assert.equal(companyHome({ modules: ['workshop', 'stand'] }), '/(app)/inicio');
  assert.equal(companyModules({ modules: ['workshop', 'stand'] }).join(), 'workshop,stand');
});
test('an explicit empty or unsupported configuration does not become an active module', () => {
  assert.equal(companyHome({ modules: [] }), '/(auth)/login');
  assert.equal(companyHome({ modules: ['unsupported'] }), '/(auth)/login');
});
