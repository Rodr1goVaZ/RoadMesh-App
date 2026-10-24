const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/company-modules.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsForTest });
const { companyModules, companyHome } = exportsForTest;
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
