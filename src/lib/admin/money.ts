export const MAX_CENTS = 100_000_000_00;

/** Whole pesos only. "1500,50" is refused rather than read as 150050. Returns NaN when it cannot be read. */
export function pesosToCents(value: string) {
  const clean = value.replace(/[\s$]/g, "");
  if (!/^(\d{1,3}(\.\d{3})+|\d+)$/.test(clean)) return Number.NaN;
  const cents = Number(clean.replaceAll(".", "")) * 100;
  return cents <= MAX_CENTS ? cents : Number.NaN;
}
