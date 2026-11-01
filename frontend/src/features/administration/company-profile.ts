import { defaultOpeningGroups, formatOpeningHours, openingHoursError } from "./company-opening-hours";
import { isValidEmail } from "@/src/shared/utils/validation";
import { CompanyModule, companyModules } from "@/src/core/auth/company-modules";

export const emptyCompany = {
  modules: ["workshop"] as CompanyModule[], name: "", legal_name: "", nif: "",
  entity_type: "" as "" | "sole_trader" | "company", sole_trader_name: "", company_people: [] as string[], country: "Portugal", district: "", municipality: "",
  address: "", postal_code: "", phone: "", mobile: "", email: "", billing_email: "",
  manager_name: "", manager_email: "", website: "", activity_start_date: "", description: "",
  opening_hours: formatOpeningHours(defaultOpeningGroups()), monthly_fee: "200", billing_cycle: "monthly", payment_day: "", support_hours: "", extra_hour_rate: "", logo_media_id: null as string | null,
};
export type CompanyForm = typeof emptyCompany;
export type CompanyErrors = Partial<Record<keyof CompanyForm, string>>;
export const requiredCompanyFields = {
  monthly_fee: "Valor mensal", billing_cycle: "Periodicidade", payment_day: "Dia de pagamento", support_hours: "Horas de assistência incluídas",
  name: "Nome comercial", legal_name: "Denominação social", nif: "NIF/NIPC", entity_type: "Tipo de entidade",
  country: "País", district: "Distrito / região", municipality: "Concelho / município", address: "Morada",
  postal_code: "Código postal", email: "Email geral",
  manager_name: "Nome do responsável", manager_email: "Email de acesso do responsável",
} as const;

export function companyForm(data?: any): CompanyForm {
  if (!data) return { ...emptyCompany, modules: [...emptyCompany.modules], company_people: [] };
  const form = { ...emptyCompany, company_people: [] as string[] };
  for (const key of Object.keys(emptyCompany) as (keyof CompanyForm)[]) {
    if (key !== "modules" && data[key] != null) (form as any)[key] = data[key];
  }
  form.modules = companyModules(data);
  form.company_people = Array.isArray(data.company_people) ? data.company_people.filter((name: unknown) => typeof name === "string") : [];
  for (const key of ["monthly_fee", "payment_day", "support_hours", "extra_hour_rate"] as const) {
    form[key] = data[key] == null ? emptyCompany[key] : String(data[key]).replace(".", ",");
  }
  if (data.monthly_fee == null) form.monthly_fee = String(defaultMonthlyFee(form.modules));
  const responsible = data.users?.find((u: any) => u.id === data.manager_id) || data.users?.find((u: any) => u.is_manager);
  form.manager_name = data.manager_name || responsible?.name || "";
  form.manager_email = data.manager_email || responsible?.email || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(form.activity_start_date)) form.activity_start_date = form.activity_start_date.split("-").reverse().join("/");
  return form;
}

function isoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.getUTCDate() === Number(day) && date.getUTCMonth() + 1 === Number(month) ? `${year}-${month}-${day}` : null;
}

export function validateCompany(form: CompanyForm): CompanyErrors {
  const errors: CompanyErrors = {};
  for (const key of Object.keys(requiredCompanyFields) as (keyof typeof requiredCompanyFields)[]) {
    if (!form[key].trim()) errors[key] = "Este campo é obrigatório.";
  }
  for (const key of ["name", "manager_name"] as const) {
    if (form[key].trim() && form[key].trim().length < 2) errors[key] = "Indique pelo menos 2 caracteres.";
  }
  if (!form.modules.length) errors.modules = "Escolha o tipo de negócio.";
  for (const key of ["email", "billing_email", "manager_email"] as const) {
    if (form[key] && !isValidEmail(form[key])) errors[key] = "Indique um email válido.";
  }
  if (["portugal", "pt"].includes(form.country.trim().toLowerCase())) {
    if (form.nif && !/^\d{9}$/.test(form.nif.trim())) errors.nif = "Indique os 9 algarismos do NIF/NIPC.";
    if (form.postal_code && !/^\d{4}-\d{3}$/.test(form.postal_code.trim())) errors.postal_code = "Use o formato 0000-000.";
  }
  if (!form.phone.trim() && !form.mobile.trim()) { errors.mobile = "Preencha o telemóvel ou o telefone."; errors.phone = errors.mobile; }
  for (const key of ["phone", "mobile"] as const) {
    const number = form[key].trim(); const digits = number.replace(/\D/g, "");
    if (number && (!/^\+?[\d\s().-]+$/.test(number) || digits.length < 6 || digits.length > 15)) errors[key] = "Indique um contacto telefónico válido.";
  }
  if (form.website.trim()) {
    try {
      const url = new URL(form.website.trim());
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    } catch { errors.website = "Use um endereço como https://empresa.pt."; }
  }
  if (form.activity_start_date.trim() && !isoDate(form.activity_start_date)) errors.activity_start_date = "Indique uma data válida: DD/MM/AAAA.";
  for (const key of ["monthly_fee", "support_hours", "extra_hour_rate"] as const) {
    if (form[key].trim() && (!/^\d+(?:[.,]\d{1,2})?$/.test(form[key].trim()) || Number(form[key].replace(",", ".")) > (key === "support_hours" ? 999999.99 : 999999999.99))) errors[key] = "Indique um valor positivo ou zero, com até 2 casas decimais.";
  }
  if (!["monthly", "quarterly", "yearly"].includes(form.billing_cycle)) errors.billing_cycle = "Escolha a periodicidade.";
  if (form.payment_day && (!/^\d{1,2}$/.test(form.payment_day.trim()) || Number(form.payment_day) < 1 || Number(form.payment_day) > 31)) errors.payment_day = "Indique um dia entre 1 e 31.";
  const scheduleError = openingHoursError(form.opening_hours);
  if (scheduleError) errors.opening_hours = scheduleError;
  return errors;
}

export function companyPayload(form: CompanyForm, logoId: string | null) {
  const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
  return { ...payload, billing_terms_version: 1, monthly_fee: form.monthly_fee.trim().replace(",", "."), support_hours: form.support_hours.trim().replace(",", "."), extra_hour_rate: form.extra_hour_rate.trim() ? form.extra_hour_rate.trim().replace(",", ".") : null, payment_day: Number(form.payment_day), sole_trader_name: form.entity_type === "sole_trader" ? form.sole_trader_name.trim() : "", company_people: form.entity_type === "company" ? form.company_people.map(name => name.trim()).filter(Boolean) : [], company_profile_version: 2, logo_media_id: logoId,
    email: form.email.trim().toLowerCase() || null, billing_email: form.billing_email.trim().toLowerCase() || null,
    manager_email: form.manager_email.trim().toLowerCase(), entity_type: form.entity_type || null,
    activity_start_date: form.activity_start_date.trim() ? isoDate(form.activity_start_date) : null };
}

export const companySteps = ["Introdução", "Identificação", "Morada", "Faturação e assistência", "Contactos e acesso"];
const stepFields: (keyof CompanyForm)[][] = [
 ["name", "modules", "description"], ["legal_name", "nif", "entity_type", "sole_trader_name", "company_people", "activity_start_date", "website", "opening_hours", "logo_media_id"],
 ["country", "district", "municipality", "address", "postal_code"], ["monthly_fee", "billing_cycle", "payment_day", "support_hours", "extra_hour_rate", "billing_email"], ["phone", "mobile", "email", "manager_name", "manager_email"],
];
export const companyFieldStep = (key: keyof CompanyForm) => stepFields.findIndex(fields => fields.includes(key));
export function validateCompanyStep(form: CompanyForm, step: number): CompanyErrors {
 return Object.fromEntries(Object.entries(validateCompany(form)).filter(([key]) => companyFieldStep(key as keyof CompanyForm) === step));
}

/** Keep one continuous date input; deleting a separator also removes the preceding digit. */
export function formatCompanyDate(value: string, previous = ""): string {
  let digits = value.replace(/\D/g, "").slice(0, 8);
  if (value.length < previous.length && previous.endsWith("/") && value === previous.slice(0, -1)) digits = digits.slice(0, -1);
  if (digits.length < 2) return digits;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatCompanyPostalCode(value: string, previous = ""): string {
  let digits = value.replace(/\D/g, "").slice(0, 7);
  if (previous.endsWith("-") && value === previous.slice(0, -1)) digits = digits.slice(0, -1);
  return digits.length < 4 ? digits : `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function isCompanyStepComplete(form: CompanyForm, step: number): boolean {
  return (Object.keys(requiredCompanyFields) as (keyof typeof requiredCompanyFields)[])
    .filter(key => companyFieldStep(key) === step).every(key => !!form[key].trim())
    && (step !== 0 || form.modules.length > 0)
    && (step !== 4 || !!(form.mobile.trim() || form.phone.trim()));
}

export function defaultMonthlyFee(modules: CompanyModule[]): number {
  return modules.includes("workshop") && modules.includes("stand") ? 300 : modules.includes("stand") ? 150 : 200;
}
export function selectCompanyModules(form: CompanyForm, modules: CompanyModule[]): CompanyForm {
  const followsDefault = !form.monthly_fee.trim() || Number(form.monthly_fee.replace(",", ".")) === defaultMonthlyFee(form.modules);
  return { ...form, modules, monthly_fee: followsDefault ? String(defaultMonthlyFee(modules)) : form.monthly_fee };
}
