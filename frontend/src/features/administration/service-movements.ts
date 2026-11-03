import { parseDueDate, readAmount } from './admin-analytics';

export type ServiceMovement = { id: string; kind: string; bucket: string; amount: string; occurred_on: string | null; created_at: string; reference: string; method: string; note: string; reverses_id: string | null };
export type MovementForm = { kind: 'payment' | 'assistance'; amount: string; date: string; reference: string; method: string; note: string };
export const movementNames: Record<string, string> = { opening: 'Saldo de abertura', billing_adjustment: 'Ajuste de faturação', payment: 'Pagamento', payment_reversal: 'Estorno de pagamento', assistance: 'Assistência', assistance_reversal: 'Estorno de assistência' };

export function movementPayload(form: MovementForm, reverse: ServiceMovement | null = null) {
  const occurred_on = parseDueDate(form.date);
  if (!occurred_on || !form.reference.trim() || form.note.trim().length < 5 || (!reverse && form.kind === 'payment' && !form.method.trim())) throw new Error('Preencha a data, referência, descrição e o método do pagamento.');
  const amount = reverse ? Math.abs(Number(reverse.amount)) : readAmount(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Indique um valor superior a zero.');
  return { kind: reverse ? reverse.bucket === 'received' ? 'payment_reversal' : 'assistance_reversal' : form.kind, amount, occurred_on, reference: form.reference.trim(), method: form.method.trim(), note: form.note.trim(), reverses_id: reverse?.id || null };
}
