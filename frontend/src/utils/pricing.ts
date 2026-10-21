/** Decimal input -> integer cents, with no floating-point pricing intermediate. */
export function saleFromMargin(cost: string, margin: string): string {
  function hundredths(value: string): bigint {
    const normalized = value.trim().replace(",", ".");
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) throw new Error("Indique um valor positivo com até duas casas decimais.");
    const [whole, fraction = ""] = normalized.split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  }
  const cents = hundredths(cost), percent = hundredths(margin);
  if (percent >= 10000n) throw new Error("A margem deve ser inferior a 100%.");
  const denominator = 10000n - percent;
  const price = (cents * 10000n + denominator / 2n) / denominator;
  return `${price / 100n}.${(price % 100n).toString().padStart(2, "0")}`;
}
