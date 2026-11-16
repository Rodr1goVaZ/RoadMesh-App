/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { loadTypeScript } = require('./test-helpers.cjs');
const paletteModule = loadTypeScript('../src/shared/theme/palettes.ts');
const { palettes, parseColorScheme, THEME_STORAGE_KEY } = paletteModule;

function luminance(hex) {
  return hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
for (const scheme of ['light', 'dark']) {
  test(`${scheme}: readable text, actions and statuses across all surfaces (WCAG AA)`, () => {
    const t = palettes[scheme].tones;
    const pairs = [];
    for (const bg of ['background', 'card', 'soft']) for (const fg of ['ink', 'secondaryInk', 'muted', 'accent']) pairs.push([fg, bg]);
    pairs.push(['onAction', 'action'], ['onAction', 'errorFill'], ['success', 'successSoft'], ['warning', 'warningSoft'], ['error', 'errorSoft'], ['info', 'infoSoft'], ['sky', 'skySoft'], ['accent', 'warm']);
    for (const [fg, bg] of pairs) assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${scheme}: ${fg}/${bg} = ${contrast(t[fg], t[bg])}`);
  });
}
test('both palettes cover the same roles and unknown stored values safely use light', () => {
  for (const key of ['tones', 'colors', 'workspace']) assert.deepEqual(Object.keys(palettes.light[key]).sort(), Object.keys(palettes.dark[key]).sort());
  assert.equal(parseColorScheme('dark'), 'dark');
  for (const value of [null, undefined, '', 'system', 'DARK', '{broken']) assert.equal(parseColorScheme(value), 'light');
});

// Exercise the provider's state/effects with controlled storage, including native startup races.
function providerHarness({ os = 'web', stored = 'dark', storage = {}, blocked = false } = {}) {
  const state = [], refs = [], effects = [], previous = [];
  let cursor = 0, refCursor = 0, effectCursor = 0;
  const react = {
    createContext: value => ({ Provider: 'provider', value }), createElement: (type, props) => ({ type, props }),
    useState: initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], v => { state[i] = v; }]; },
    useRef: value => { const i = refCursor++; return refs[i] || (refs[i] = { current: value }); },
    useCallback: value => value, useMemo: fn => fn(), useContext: context => context.value,
    useEffect: (fn, deps) => { const i = effectCursor++; if (!previous[i] || deps.some((v, k) => v !== previous[i][k])) { effects.push(fn); previous[i] = deps; } },
  };
  const writes = [], events = {}, root = { style: { setProperty() {} } };
  const asyncStorage = { getItem: async () => stored, setItem: async (key, value) => { writes.push([key, value]); }, ...storage };
  const modules = {
    react: { ...react, default: react, __esModule: true }, 'react-native': { Platform: { OS: os }, Appearance: {}, StyleSheet: { create: x => x } },
    '@react-native-async-storage/async-storage': { default: asyncStorage, __esModule: true }, './palettes': paletteModule,
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/shared/theme/ThemeProvider.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert.ok(modules[name], name); return modules[name]; }, window: { localStorage: { getItem() { if (blocked) throw Error('disabled'); return stored; } }, addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener() {} }, document: { documentElement: root, body: { style: {} }, querySelector: () => null } });
  return { writes, events, render() { cursor = refCursor = effectCursor = 0; return exports.ThemeProvider({}).props.value; }, effects() { while (effects.length) effects.shift()(); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('web starts with the saved theme before paint and remains usable when storage is disabled', () => {
  assert.equal(providerHarness().render().scheme, 'dark');
  assert.equal(providerHarness({ blocked: true }).render().scheme, 'light');
  const h = providerHarness(); h.render(); h.effects(); h.events.storage({ key: THEME_STORAGE_KEY, newValue: 'light' }); assert.equal(h.render().scheme, 'light');
  h.events.storage({ key: 'roadmesh_token', newValue: null }); assert.equal(h.render().scheme, 'light');
});
test('a late native preference read cannot undo a choice made during startup', async () => {
  let finish;
  const h = providerHarness({ os: 'android', storage: { getItem: () => new Promise(resolve => { finish = resolve; }) } });
  const theme = h.render(); h.effects(); theme.setScheme('dark'); finish('light'); await settle();
  assert.equal(h.render().scheme, 'dark');
  assert.deepEqual(h.writes, [[THEME_STORAGE_KEY, 'dark']]);
});
test('rapid selections write in order, and a storage failure does not block later changes', async () => {
  let finish, first = true; const writes = [];
  const h = providerHarness({ storage: { setItem: (key, value) => { writes.push([key, value]); if (first) { first = false; return new Promise((_, reject) => { finish = () => reject(Error('full')); }); } return Promise.resolve(); } } });
  const theme = h.render(); theme.setScheme('light'); theme.setScheme('dark'); await settle();
  assert.equal(writes.length, 1); finish(); await settle(); await settle();
  assert.deepEqual(writes, [[THEME_STORAGE_KEY, 'light'], [THEME_STORAGE_KEY, 'dark']]);
  assert.equal(h.render().scheme, 'dark');
});

test('screens cannot introduce hard-coded foreground or background colours outside the palettes', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx$/.test(e.name) ? [path.join(dir, e.name)] : []);
  for (const file of [...walk(path.join(__dirname, '../app')), ...walk(path.join(__dirname, '../src'))]) {
    if (file.endsWith('+html.tsx')) continue; // Only the pre-hydration document uses literal fallback colours.
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteral(node) && /^(#[\da-f]{3,8}$|rgba?\(|white$|black$)/i.test(node.text)) assert.fail(`Fixed colour in ${path.relative(__dirname, file)}: ${node.text}`);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

