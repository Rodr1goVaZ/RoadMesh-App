import { companyForm, CompanyForm, emptyCompany } from "./company-profile";

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export const companyDraftKey = (userId: string, id?: string) => `roadmesh:company-draft:v1:${userId}:${id || "new"}`;
export function decodeCompanyDraft(raw: string | null): { form: CompanyForm; step: number; savedAt: string } | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (![1, 2].includes(value.version) || !Number.isInteger(value.step) || value.step < 0 || value.step > (value.version === 1 ? 3 : 4) || !value.form || !Number.isFinite(Date.parse(value.savedAt))) throw new Error("Rascunho inválido.");
  const newFields = ["monthly_fee", "billing_cycle", "payment_day", "support_hours", "extra_hour_rate"];
  const form = value.version === 1 ? { ...value.form } : value.form;
  if (value.version === 1) {
    const migrated = companyForm(form);
    for (const key of newFields) if (form[key] == null) form[key] = migrated[key as keyof CompanyForm];
  }
  for (const [key, fallback] of Object.entries(emptyCompany)) {
    if (typeof fallback === "string" && typeof form[key] !== "string") throw new Error("Rascunho incompleto.");
  }
  if (!Array.isArray(form.modules) || !form.modules.length || form.modules.length > 2 || new Set(form.modules).size !== form.modules.length || form.modules.some((m: unknown) => m !== "workshop" && m !== "stand") || !["", "company", "sole_trader"].includes(form.entity_type) || !Array.isArray(form.company_people) || form.company_people.length > 20 || form.company_people.some((n: unknown) => typeof n !== "string" || n.length > 100) || (form.logo_media_id !== null && typeof form.logo_media_id !== "string")) throw new Error("Rascunho inválido.");
  return { form: companyForm(form), step: value.version === 1 && value.step === 3 ? 4 : value.step, savedAt: value.savedAt };
}
export function createCompanyDraftStore(storage: Storage, key: string) {
  let queue = Promise.resolve();
  const enqueue = (operation: () => Promise<void>) => { const task = queue.then(operation); queue = task.catch(() => {}); return task; };
  return {
    load: async () => decodeCompanyDraft(await storage.getItem(key)),
    save: (form: CompanyForm, step: number, savedAt: string) => {
      const snapshot = JSON.stringify({ version: 2, form: companyForm(form), step, savedAt });
      return enqueue(() => storage.setItem(key, snapshot));
    },
    clear: () => enqueue(() => storage.removeItem(key)),
  };
}
