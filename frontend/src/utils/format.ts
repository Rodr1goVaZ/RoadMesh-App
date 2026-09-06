// PT-PT formatting utilities
export function formatEUR(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
}
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch { return "-"; }
}
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(d);
  } catch { return "-"; }
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
