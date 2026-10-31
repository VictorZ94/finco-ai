import { formatIsoDate } from '../../lib/dates.ts'
import type { Period } from './types.ts'

export type PresetKey = 'this-month' | 'last-month' | 'this-year' | 'last-year'

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-year', label: 'This year' },
  { key: 'last-year', label: 'Last year' },
]

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function iso(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** A real calendar date in YYYY-MM-DD. */
export function isIsoDate(value: string | null | undefined): value is string {
  const match = value ? ISO_DATE.exec(value) : null
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDay(year, month)
}

/** The preset's range relative to `today` (YYYY-MM-DD). Current periods end today. */
export function presetPeriod(key: PresetKey, today: string): Period {
  const [year, month] = today.split('-').map(Number)
  switch (key) {
    case 'this-month':
      return { from: iso(year, month, 1), to: today }
    case 'last-month': {
      const [y, m] = month === 1 ? [year - 1, 12] : [year, month - 1]
      return { from: iso(y, m, 1), to: iso(y, m, lastDay(y, m)) }
    }
    case 'this-year':
      return { from: iso(year, 1, 1), to: today }
    case 'last-year':
      return { from: iso(year - 1, 1, 1), to: iso(year - 1, 12, 31) }
  }
}

export function matchPreset(period: Period, today: string): PresetKey | null {
  const preset = PRESETS.find(({ key }) => {
    const range = presetPeriod(key, today)
    return range.from === period.from && range.to === period.to
  })
  return preset?.key ?? null
}

/** The period in the URL, or this month when it is missing or invalid. */
export function readPeriod(params: URLSearchParams, today: string): Period {
  const from = params.get('from')
  const to = params.get('to')
  if (isIsoDate(from) && isIsoDate(to) && from <= to) return { from, to }
  return presetPeriod('this-month', today)
}

/** Apply an edit to one end; the other end moves along if they would cross. */
export function changePeriod(period: Period, end: keyof Period, value: string): Period {
  if (!isIsoDate(value)) return period
  if (end === 'from') return { from: value, to: value > period.to ? value : period.to }
  return { from: value < period.from ? value : period.from, to: value }
}

/** "1 oct 2026 – 31 oct 2026" */
export function formatPeriod(period: Period): string {
  return `${formatIsoDate(period.from)} – ${formatIsoDate(period.to)}`
}
