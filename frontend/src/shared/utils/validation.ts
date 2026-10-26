/** Client-side input helpers. The API remains authoritative for permissions and validation. */
export function isValidEmail(value: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
}

/** Compare plates and barcodes independently of spaces, hyphens and case. */
export function normalizeIdentifier(value: string | null | undefined): string {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function parseDecimal(value: string): number {
  return Number(value.replace(",", "."));
}

export function requireDecimal(value: string): number {
  const result = parseDecimal(value);
  if (!Number.isFinite(result)) throw new Error("Indique valores numéricos válidos.");
  return result;
}
