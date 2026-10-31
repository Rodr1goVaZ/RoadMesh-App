const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./test-helpers.cjs');
const { changeLabel, readAmount, parseDueDate, hours } = loadTypeScript('../src/features/administration/admin-analytics.ts');
test('comparisons distinguish missing data from zero and never divide by zero', () => {
  assert.match(changeLabel(null, 50, 'anterior'), /Sem comparação/);
  assert.match(changeLabel(100, null, 'anterior'), /Sem comparação/);
  assert.match(changeLabel(10, 0, 'anterior'), /Primeiro valor/);
  assert.match(changeLabel(150, 100, 'anterior'), /\+50%/);
  assert.match(changeLabel(50, 100, 'anterior'), /-50%/);
});
test('monthly manual entries support decimal comma but reject invalid and non-finite numbers', () => {
  assert.equal(readAmount('12,50'), 12.5); assert.equal(readAmount('0'), 0);
  for (const value of ['', '-1', 'NaN', 'Infinity', '1.234', '1e8']) assert.throws(() => readAmount(value));
});
test('due dates validate real dates and may be omitted', () => {
  assert.equal(parseDueDate(''), null); assert.equal(parseDueDate('29/02/2024'), '2024-02-29');
  assert.throws(() => parseDueDate('29/02/2026')); assert.throws(() => parseDueDate('2026-10-31'));
});
test('missing assistance hours are distinct from an explicit zero', () => {
  assert.equal(hours(null), '—'); assert.equal(hours(0), '0 h'); assert.equal(hours(3.5), '3,5 h');
});
