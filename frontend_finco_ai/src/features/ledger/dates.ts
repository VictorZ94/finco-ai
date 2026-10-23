const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** Today's date as YYYY-MM-DD in the user's local time zone (not UTC). */
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Format a YYYY-MM-DD date without shifting it through UTC. */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return dateFormat.format(new Date(year, month - 1, day))
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(typeof value === 'string' ? new Date(value) : value)
}
