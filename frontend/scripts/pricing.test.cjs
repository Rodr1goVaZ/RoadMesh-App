const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../src/utils/pricing.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exported = {};
vm.runInNewContext(compiled, { exports: exported, BigInt, Error });
const { saleFromMargin } = exported;
test('margin uses sale price denominator, not cost markup', () => assert.equal(saleFromMargin('80', '20'), '100.00'));
test('decimal comma and half-cent rounding are exact', () => {
  assert.equal(saleFromMargin('0,01', '20'), '0.01');
  assert.equal(saleFromMargin('10,00', '33,33'), '15.00');
  assert.equal(saleFromMargin('0.01', '60'), '0.03');
});
test('zero cost and zero margin have a defined result', () => {
  assert.equal(saleFromMargin('0', '50'), '0.00'); assert.equal(saleFromMargin('10', '0'), '10.00');
});
test('invalid, excessive and negative values are rejected', () => {
  for (const margin of ['100', '101', '-1', 'NaN', '1e2', '']) assert.throws(() => saleFromMargin('10', margin));
  for (const cost of ['-1', 'Infinity', '1.234', '']) assert.throws(() => saleFromMargin(cost, '20'));
});
