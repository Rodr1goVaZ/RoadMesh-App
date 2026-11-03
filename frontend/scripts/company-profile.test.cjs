const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./test-helpers.cjs');
const schedule = loadTypeScript('../src/features/administration/company-opening-hours.ts');
const validation = loadTypeScript('../src/shared/utils/validation.ts');
const modules = loadTypeScript('../src/core/auth/company-modules.ts');
const { companyForm, validateCompany, companyPayload } = loadTypeScript('../src/features/administration/company-profile.ts', {
  modules: { '@/src/shared/utils/validation': validation, '@/src/core/auth/company-modules': modules, './company-opening-hours': schedule }, globals: { URL },
});
const valid = () => ({ ...companyForm(), payment_day: '5', support_hours: '10', name: 'Auto Teste', legal_name: 'Auto Teste Lda.', nif: '500123456', entity_type: 'company',
  district: 'Lisboa', municipality: 'Sintra', address: 'Rua dos Testes 1', postal_code: '2710-001', phone: '+351 210 000 000', email: 'geral@teste.pt', manager_name: 'Responsável Teste', manager_email: 'responsavel@teste.pt' });

test('a company needs its required profile but optional fields may stay empty', () => {
  assert.equal(Object.keys(validateCompany(valid())).length, 0);
  const errors = validateCompany(companyForm());
  for (const field of ['legal_name', 'entity_type', 'phone', 'email', 'manager_name', 'postal_code']) assert.ok(errors[field]);
});
test('Portuguese identifiers and real calendar dates are validated before submission', () => {
  const errors = validateCompany({ ...valid(), nif: '123', postal_code: '2710001', activity_start_date: '31/02/2026', phone: 'telefone' });
  for (const field of ['nif', 'postal_code', 'activity_start_date', 'phone']) assert.ok(errors[field]);
  assert.equal(validateCompany({ ...valid(), activity_start_date: '29/02/2024' }).activity_start_date, undefined);
});
test('optional email and website still reject invalid values and unsafe schemes', () => {
  const errors = validateCompany({ ...valid(), website: 'javascript:alert(1)', billing_email: 'invalido' });
  assert.ok(errors.website); assert.ok(errors.billing_email);
});
test('payload normalizes emails and dates and supports clearing optional fields', () => {
  const payload = companyPayload({ ...valid(), manager_email: ' RESPONSAVEL@teste.pt ', activity_start_date: '28/10/2026' }, null);
  assert.equal(payload.manager_email, 'responsavel@teste.pt'); assert.equal(payload.activity_start_date, '2026-10-28');
  assert.equal(payload.billing_email, null); assert.equal(payload.company_profile_version, 2);
});
test('editing restores the profile and the linked responsible account without inventing legal data', () => {
  const form = companyForm({ name: 'Empresa antiga', modules: ['stand'], manager_id: 'owner', activity_start_date: '2020-03-15', users: [{ id: 'owner', name: 'Responsável', email: 'r@teste.pt' }] });
  assert.equal(form.manager_email, 'r@teste.pt'); assert.equal(form.activity_start_date, '15/03/2020');
  assert.equal(form.modules[0], 'stand'); assert.equal(form.legal_name, '');
});


test('contacts require either mobile or telephone and validate both when supplied', () => {
  assert.deepEqual(Object.keys(validateCompany({ ...valid(), phone: '', mobile: '910000000' })), []);
  assert.deepEqual(Object.keys(validateCompany({ ...valid(), mobile: '' })), []);
  const missing = validateCompany({ ...valid(), phone: ' ', mobile: '' });
  assert.ok(missing.phone); assert.ok(missing.mobile);
  assert.ok(validateCompany({ ...valid(), phone: 'bad', mobile: '910000000' }).phone);
});
