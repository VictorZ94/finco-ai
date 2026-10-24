// Month keys are "YYYY-MM" strings, built in local time (never through UTC).

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const index = year * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

function toDate(month: string, day = 1): Date {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, day)
}

// Month names follow the UI language (English); amounts stay in es-CO peso formatting.
const longFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const shortFormat = new Intl.DateTimeFormat('en-US', { month: 'short' })
const nameFormat = new Intl.DateTimeFormat('en-US', { month: 'long' })
const dayFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "October 2026" */
export function formatMonthLong(month: string): string {
  return capitalize(longFormat.format(toDate(month)))
}

/** "Oct" (chart ticks) */
export function formatMonthShort(month: string): string {
  return shortFormat.format(toDate(month)).replace('.', '')
}

/** "September" */
export function formatMonthName(month: string): string {
  return nameFormat.format(toDate(month))
}

/** Last day of the month, e.g. "Oct 31, 2026". */
export function formatMonthEnd(month: string): string {
  const next = toDate(shiftMonth(month, 1))
  return dayFormat.format(new Date(next.getFullYear(), next.getMonth(), 0))
}
