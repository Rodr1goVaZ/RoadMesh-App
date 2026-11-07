const { loadTypeScript } = require('./test-helpers.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { enabledFeatures, hasFeature, featureCatalog, monthlySubscription } = loadTypeScript('../src/core/auth/company-features.ts');
const { companyHome } = loadTypeScript('../src/core/auth/company-modules.ts');

test('every combination is independent of the preset or old business type', () => {
  for (let mask = 0; mask < 32; mask++) {
    const active = featureCatalog.filter((_, i) => mask & (1 << i)).map(item => item.id);
    const company = { subscription_version: 1, enabled_modules: active, modules: ['stand'] };
    assert.equal(JSON.stringify(enabledFeatures(company)), JSON.stringify(active));
    for (const item of featureCatalog) assert.equal(hasFeature(company, item.id), active.includes(item.id));
    assert.equal(companyHome(company), '/(app)/inicio');
  }
});

test('monthly total adds only active module prices with exact cents', () => {
  const prices = Object.fromEntries(featureCatalog.map(item => [item.id, '99,99']));
  prices.inventory = '0,20';
  assert.equal(monthlySubscription('0,10', ['inventory'], prices), '0,30');
  assert.equal(monthlySubscription('45,50', [], prices), '45,50');
  assert.equal(monthlySubscription('-1', [], prices), '');
  assert.equal(monthlySubscription('999999999,99', ['inventory'], prices), '');
});
