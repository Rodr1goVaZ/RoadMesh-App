const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./test-helpers.cjs');
const { isValidEmail, normalizeIdentifier, parseDecimal, requireDecimal } = loadTypeScript('../src/shared/utils/validation.ts');
const { formatDate, formatShortDate, formatDateTime, formatEUR } = loadTypeScript('../src/shared/utils/format.ts');

test('email validation is consistent for login, recovery, documents and client contacts', () => {
  assert.equal(isValidEmail(' cliente@example.pt '), true);
  for (const value of ['', 'name@', 'name@host', 'name host@example.pt', null]) assert.equal(isValidEmail(value), false);
});
test('vehicle and barcode identifiers ignore separators and case', () => {
  assert.equal(normalizeIdentifier(' ab-12 cd '), 'AB12CD');
  assert.equal(normalizeIdentifier(null), '');
});
test('decimal input accepts Portuguese comma while strict input rejects non-finite values', () => {
  assert.equal(parseDecimal('12,50'), 12.5);
  assert.equal(requireDecimal('12.50'), 12.5);
  for (const value of ['Infinity', 'NaN', 'texto']) assert.throws(() => requireDecimal(value), /numéricos válidos/);
});
test('all date displays handle absent and invalid dates without crashing', () => {
  for (const format of [formatDate, formatShortDate, formatDateTime]) {
    assert.equal(format(null), '-');
    assert.equal(format('invalid'), '-');
    assert.match(format('2026-10-26T12:30:00Z'), /2026/);
  }
});
test('currency formatting preserves the Portuguese locale and missing-value fallback', () => {
  assert.match(formatEUR(1234.5), /1.*234,50/);
  assert.match(formatEUR(undefined), /0,00/);
});
