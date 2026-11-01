export const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export type ServiceRecord = { billed: number | string; received: number | string; hours_included: number | string; hours_used: number | string; due_date: string | null; note: string; revision: number };
export type ServiceSummary = { billed: number | null; received: number | null; pending: number | null; hours_included: number | null; hours_used: number | null; hours_extra: number | null; paid: number; pending_companies: number; overdue: number; recorded: number; unrecorded: number };
export type ServiceCompany = { id: string; name: string; company_status: string; state: 'unrecorded' | 'pending' | 'paid' | 'free'; record: ServiceRecord | null; pending: number | null };
export type ServiceMonth = { month: number; billed: number | null; received: number | null; previous_billed: number | null; hours_used: number | null; hours_included: number | null; previous_hours_used: number | null };
export type AdminAnalytics = { year: number; month: number; period: string; summary: ServiceSummary; previous_month: ServiceSummary; previous_year_month: ServiceSummary; annual: ServiceSummary; previous_annual: ServiceSummary; months: ServiceMonth[]; companies: ServiceCompany[] };
export function changeLabel(current: number | null, previous: number | null, label: string): string {
  if (current === null || previous === null) return `Sem comparação · ${label}`;
  if (previous === 0) return current === 0 ? `Sem alteração · ${label}` : `Primeiro valor · ${label}`;
  const change = (current - previous) / previous * 100;
  return `${change > 0 ? '+' : ''}${change.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}% · ${label}`;
}
export function readAmount(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Preencha os valores com números positivos ou zero, com até 2 casas decimais.');
  const amount = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(amount)) throw new Error('Indique um valor válido.');
  return amount;
}
export function parseDueDate(value: string): string | null {
  if (!value.trim()) return null;
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!parts) throw new Error('Use DD/MM/AAAA na data limite de pagamento.');
  const [, day, month, year] = parts;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month)) throw new Error('Indique uma data limite válida.');
  return `${year}-${month}-${day}`;
}
export function hours(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} h`;
}
