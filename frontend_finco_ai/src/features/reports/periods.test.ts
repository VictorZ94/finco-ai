import { describe, expect, it } from 'vitest'
import { changePeriod, isIsoDate, matchPreset, presetPeriod, readPeriod } from './periods.ts'

const TODAY = '2026-10-31'

describe('presetPeriod', () => {
  it('builds ranges relative to today', () => {
    expect(presetPeriod('this-month', TODAY)).toEqual({ from: '2026-10-01', to: TODAY })
    expect(presetPeriod('last-month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(presetPeriod('this-year', TODAY)).toEqual({ from: '2026-01-01', to: TODAY })
    expect(presetPeriod('last-year', TODAY)).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })

  it('wraps last month across the year and knows leap years', () => {
    expect(presetPeriod('last-month', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(presetPeriod('last-month', '2028-03-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('readPeriod', () => {
  it('reads a valid range from the URL', () => {
    expect(readPeriod(new URLSearchParams('from=2026-01-01&to=2026-06-30'), TODAY)).toEqual({
      from: '2026-01-01',
      to: '2026-06-30',
    })
  })

  it('falls back to this month when missing, invalid or reversed', () => {
    for (const query of ['', 'from=2026-02-30&to=2026-03-01', 'from=2026-05-01&to=2026-04-01', 'from=x&to=y']) {
      expect(readPeriod(new URLSearchParams(query), TODAY)).toEqual({ from: '2026-10-01', to: TODAY })
    }
  })
})

describe('changePeriod', () => {
  const period = { from: '2026-10-01', to: '2026-10-31' }

  it('moves the other end so the range never crosses', () => {
    expect(changePeriod(period, 'from', '2026-11-15')).toEqual({ from: '2026-11-15', to: '2026-11-15' })
    expect(changePeriod(period, 'to', '2026-09-01')).toEqual({ from: '2026-09-01', to: '2026-09-01' })
    expect(changePeriod(period, 'to', '2026-10-15')).toEqual({ from: '2026-10-01', to: '2026-10-15' })
  })

  it('ignores a half-typed date', () => {
    expect(changePeriod(period, 'from', '')).toBe(period)
  })
})

it('matches presets and validates dates', () => {
  expect(matchPreset({ from: '2026-01-01', to: TODAY }, TODAY)).toBe('this-year')
  expect(matchPreset({ from: '2026-01-02', to: TODAY }, TODAY)).toBeNull()
  expect(isIsoDate('2026-02-29')).toBe(false)
  expect(isIsoDate('2028-02-29')).toBe(true)
})
