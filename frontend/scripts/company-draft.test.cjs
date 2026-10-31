const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./test-helpers.cjs');
const schedule = loadTypeScript('../src/features/administration/company-opening-hours.ts');
const validation = loadTypeScript('../src/shared/utils/validation.ts');
const modules = loadTypeScript('../src/core/auth/company-modules.ts');
const profile = loadTypeScript('../src/features/administration/company-profile.ts', { modules: { '@/src/shared/utils/validation': validation, '@/src/core/auth/company-modules': modules, './company-opening-hours': schedule }, globals: { URL } });
const { companyDraftKey, createCompanyDraftStore, decodeCompanyDraft } = loadTypeScript('../src/features/administration/company-draft.ts', { modules: { './company-profile': profile } });
test('each step only checks its own fields and entity names are optional', () => {
 const form = { ...profile.companyForm(), name: 'Oficina Teste' };
 assert.equal(Object.keys(profile.validateCompanyStep(form, 0)).length, 0);
 assert.ok(profile.validateCompanyStep(form, 1).entity_type);
 assert.equal(profile.validateCompanyStep(form, 1).company_people, undefined);
 assert.equal(profile.companyFieldStep('manager_email'), 4);
 const names = { ...form, entity_type: 'company', sole_trader_name: 'Outro', company_people: [' Ana ', '', ' Rui '] };
 assert.equal(JSON.stringify(profile.companyPayload(names, null).company_people), '["Ana","Rui"]');
 assert.equal(profile.companyPayload(names, null).sole_trader_name, '');
 assert.equal(profile.companyPayload({ ...names, entity_type: 'sole_trader' }, null).company_people.length, 0);
});
test('draft restores fields and step, isolates accounts, and excludes unknown secrets', async () => {
 const values = new Map(); const storage = { getItem: async key => values.get(key) || null, setItem: async (key,value) => { values.set(key,value); }, removeItem: async key => { values.delete(key); } };
 const store = createCompanyDraftStore(storage, companyDraftKey('admin'));
 assert.notEqual(companyDraftKey('admin'), companyDraftKey('other'));
 assert.notEqual(companyDraftKey('admin'), companyDraftKey('admin', 'existing'));
 await store.save({ ...profile.companyForm(), name: 'Rascunho', company_people: ['Ana'], password: 'never-store' }, 2, new Date().toISOString());
 const restored = await store.load(); assert.equal(restored.step, 2); assert.equal(restored.form.name, 'Rascunho'); assert.equal(restored.form.company_people[0], 'Ana');
 assert.equal([...values.values()][0].includes('never-store'), false);
 await Promise.all([store.save(profile.companyForm(), 0, new Date().toISOString()), store.clear()]);
 assert.equal(await store.load(), null);
});
test('corrupt drafts and failed writes are reported without silently discarding work', async () => {
 assert.throws(() => decodeCompanyDraft('{broken'));
 assert.throws(() => decodeCompanyDraft(JSON.stringify({ version: 1, step: 8, form: {} })));
 const store = createCompanyDraftStore({ getItem: async () => { throw Error('blocked'); }, setItem: async () => { throw Error('full'); }, removeItem: async () => {} }, 'key');
 await assert.rejects(store.load()); await assert.rejects(store.save(profile.companyForm(), 0, new Date().toISOString()));
 await store.clear();
});

test('stage ticks follow required fields as soon as they are filled', () => {
 const form = { ...profile.companyForm(), phone: '123', email: 'em-preenchimento', manager_name: 'JS', manager_email: 'js' };
 assert.equal(profile.isCompanyStepComplete(form, 4), true);
 assert.equal(profile.isCompanyStepComplete({ ...form, manager_email: '  ' }, 4), false);
 assert.equal(profile.isCompanyStepComplete(form, 0), false);
 assert.equal(profile.isCompanyStepComplete({ ...form, name: 'Oficina' }, 0), true);
 assert.equal(profile.companyFieldStep('billing_email'), 3);
 assert.equal(profile.companyFieldStep('website'), 1);
});

test('billing plans suggest the right price and preserve negotiated amounts', () => {
 let form = profile.companyForm();
 assert.equal(form.monthly_fee, '200');
 form = profile.selectCompanyModules(form, ['stand']); assert.equal(form.monthly_fee, '150');
 form = profile.selectCompanyModules(form, ['workshop', 'stand']); assert.equal(form.monthly_fee, '300');
 form = profile.selectCompanyModules({ ...form, monthly_fee: '275,50' }, ['workshop']); assert.equal(form.monthly_fee, '275,50');
 const existing = profile.companyForm({ modules: ['stand'], monthly_fee: '165.00', payment_day: 8, support_hours: '5.5', extra_hour_rate: null });
 assert.equal(existing.monthly_fee, '165,00'); assert.equal(existing.payment_day, '8'); assert.equal(existing.support_hours, '5,5');
 assert.equal(profile.companyFieldStep('support_hours'), 3);
 assert.ok(profile.validateCompanyStep({ ...existing, monthly_fee: '-1', payment_day: '32', support_hours: 'x' }, 3).monthly_fee);
 const payload = profile.companyPayload({ ...existing, payment_day: '10', support_hours: '4,5', extra_hour_rate: '35,50' }, null);
 assert.equal(payload.billing_terms_version, 1); assert.equal(payload.support_hours, '4.5'); assert.equal(payload.extra_hour_rate, '35.50');
});
test('old four-step drafts are migrated without losing contacts or changing the selected plan', async () => {
 const old = { ...profile.companyForm(), modules: ['stand'], name: 'Rascunho antigo' };
 for (const key of ['monthly_fee', 'billing_cycle', 'payment_day', 'support_hours', 'extra_hour_rate']) delete old[key];
 const restored = decodeCompanyDraft(JSON.stringify({ version: 1, form: old, step: 3, savedAt: new Date().toISOString() }));
 assert.equal(restored.step, 4); assert.equal(restored.form.monthly_fee, '150'); assert.equal(restored.form.name, 'Rascunho antigo');
});

test('weekly opening selectors round-trip and preserve legacy schedules', () => {
 const defaults = schedule.defaultOpeningGroups();
 const text = schedule.formatOpeningHours(defaults);
 assert.equal(schedule.openingHoursError(text), undefined);
 assert.equal(JSON.stringify(schedule.parseOpeningHours(text)), JSON.stringify(defaults));
 assert.equal(schedule.parseOpeningHours('Segunda a sexta, 09:00–18:00')[0].days.length, 5);
 assert.equal(schedule.parseOpeningHours('Por marcação'), null);
 assert.equal(schedule.openingHoursError('Por marcação'), undefined);
 assert.ok(schedule.openingHoursError(schedule.formatOpeningHours([{days: [], intervals: [{start:'09:00',end:'18:00'}]}])));
 assert.ok(schedule.openingHoursError(schedule.formatOpeningHours([{days:[0], intervals:[{start:'09:00',end:'13:00'},{start:'12:00',end:'18:00'}]}])));
 assert.ok(schedule.openingHoursError(schedule.formatOpeningHours([{days:[0], intervals:[{start:'18:00',end:'09:00'}]}])));
});
test('numeric company fields reject letters and keep the appropriate separators', () => {
 assert.equal(schedule.numericCompanyInput('nif', '50a0 123 456'), '500123456');
 assert.equal(schedule.numericCompanyInput('payment_day', 'a3x1'), '31');
 assert.equal(schedule.numericCompanyInput('monthly_fee', '€ 200,5a0'), '200,50');
 assert.equal(schedule.numericCompanyInput('support_hours', '10.25x4'), '10.25');
 assert.equal(schedule.numericCompanyInput('phone', '+351 abc 910 000 000'), '+351  910 000 000');
});
