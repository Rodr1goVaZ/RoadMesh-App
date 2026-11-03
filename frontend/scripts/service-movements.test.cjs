const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./test-helpers.cjs');
const analytics = loadTypeScript('../src/features/administration/admin-analytics.ts');
const { movementPayload } = loadTypeScript('../src/features/administration/service-movements.ts', { modules: { './admin-analytics': analytics } });
const form = { kind: 'payment', amount: '25,50', date: '01/11/2026', reference: ' BANK-1 ', method: ' transferência ', note: ' Recebimento de teste ' };

test('individual payments retain actual date, reference and method with decimal comma', () => {
  const result = movementPayload(form);
  assert.equal(result.amount, 25.5); assert.equal(result.occurred_on, '2026-11-01');
  assert.equal(result.reference, 'BANK-1'); assert.equal(result.method, 'transferência');
  assert.equal(result.reverses_id, null);
});
test('payments cannot silently invent dates or omit identifying details', () => {
  for (const value of [{ date: '' }, { date: '31/02/2026' }, { method: ' ' }, { reference: '' }, { note: ' ' }, { amount: '0' }, { amount: 'NaN' }]) {
    assert.throws(() => movementPayload({ ...form, ...value }));
  }
});
test('assistance needs its own date and reference but no payment method', () => {
  const result = movementPayload({ ...form, kind: 'assistance', amount: '1,25', method: '' });
  assert.equal(result.kind, 'assistance'); assert.equal(result.amount, 1.25);
});
test('reversal uses the original full amount and bucket, including old opening balances', () => {
  const original = { id: 'original', kind: 'opening', bucket: 'received', amount: '30.00' };
  const result = movementPayload({ ...form, kind: 'assistance', amount: '999', method: '' }, original);
  assert.equal(result.kind, 'payment_reversal'); assert.equal(result.amount, 30);
  assert.equal(result.reverses_id, 'original'); assert.equal(original.amount, '30.00');
  assert.equal(movementPayload(form, { ...original, bucket: 'hours_used' }).kind, 'assistance_reversal');
});
