// Amounts are handled as integer cents so sums never suffer float rounding.

const AMOUNT_PATTERN = /^\d{1,13}([.,]\d{1,2})?$/

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Parse user input ("50000", "1500,5", "99.99") to cents; null when empty or invalid. */
export function toCents(input: string): number | null {
  const value = input.trim()
  if (!AMOUNT_PATTERN.test(value)) return null
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export function isValidAmount(input: string): boolean {
  return input.trim() === '' || toCents(input) !== null
}

/** Cents to the API's decimal string, e.g. 5000050 -> "50000.50". */
export function centsToApi(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function formatCents(cents: number): string {
  return currency.format(cents / 100)
}

/** Format an API decimal string ("50000.00") for display. */
export function formatApiAmount(value: string): string {
  return formatCents(toCents(value) ?? 0)
}

/** Parse an API decimal string that may be negative ("-130000.00") to cents. */
export function apiToCents(value: string): number {
  const negative = value.trim().startsWith('-')
  const cents = toCents(value.trim().replace(/^-/, '')) ?? 0
  return negative ? -cents : cents
}

const compact = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Short money for chart axes, e.g. 3000000 pesos -> "$ 3 M". */
export function formatCompact(cents: number): string {
  return compact.format(cents / 100)
}
