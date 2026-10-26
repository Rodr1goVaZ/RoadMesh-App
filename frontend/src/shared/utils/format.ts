// PT-PT formatting utilities
const currencyFormatter = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
export function formatEUR(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return currencyFormatter.format(n);
}

function formatTemporal(iso: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("pt-PT", options).format(new Date(iso));
  } catch { return "-"; }
}

export function formatDate(iso: string | null | undefined): string {
  return formatTemporal(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatShortDate(iso: string | null | undefined): string {
  return formatTemporal(iso, { day: "numeric", month: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatTemporal(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function todayLongPT(): string {
  const d = new Date();
  const s = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const OS_STATUS_LABELS: Record<string, string> = {
  entrada: "Entrada",
  diagnostico: "Diagnóstico",
  aguardando_pecas: "Aguarda peças",
  concluido: "Concluído",
};
export const OS_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  entrada: { bg: "#DBEAFE", fg: "#1D4ED8" },
  diagnostico: { bg: "#FEF3C7", fg: "#B45309" },
  aguardando_pecas: { bg: "#E5E7EB", fg: "#374151" },
  concluido: { bg: "#DCFCE7", fg: "#15803D" },
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aceite: "Aceite", recusado: "Recusado",
};
