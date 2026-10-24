import { describe, expect, it } from 'vitest'
import { formatMonthEnd, shiftMonth } from './months.ts'

describe('months', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-10', -5)).toBe('2026-05')
  })

  it('formats the last day of the month', () => {
    expect(formatMonthEnd('2026-02')).toContain('28')
    expect(formatMonthEnd('2024-02')).toContain('29')
  })
})
