const int = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })
const one = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const two = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

export function fmtInt(v: number | undefined | null): string {
  return int.format(Math.round(v ?? 0))
}

/** Up to one decimal place ("1,5"). */
export function fmt1(v: number | undefined | null): string {
  return one.format(v ?? 0)
}

export function fmt2(v: number | undefined | null): string {
  return two.format(v ?? 0)
}

/** Grams with sensible precision: below 10 g one decimal, otherwise integer. */
export function fmtGrams(v: number | undefined | null): string {
  const n = v ?? 0
  return Math.abs(n) < 10 ? one.format(n) : int.format(Math.round(n))
}

/** Parse a user-entered decimal number that may use a comma. */
export function parseDecimal(input: string): number {
  const n = Number(input.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Format a number for an input field (comma decimal, trimmed). */
export function toInputValue(v: number | undefined | null, maxDecimals = 1): string {
  if (v === undefined || v === null || Number.isNaN(v)) return ''
  const f = 10 ** maxDecimals
  return String(Math.round(v * f) / f).replace('.', ',')
}
