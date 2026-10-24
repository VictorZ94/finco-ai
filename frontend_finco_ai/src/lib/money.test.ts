import { describe, expect, it } from 'vitest'
import { apiToCents, centsToApi, formatApiAmount, toCents } from './money.ts'

describe('money', () => {
  it('parses user input to cents', () => {
    expect(toCents('50000')).toBe(5000000)
    expect(toCents('1500,5')).toBe(150050)
    expect(toCents('-5')).toBeNull()
  })

  it('parses signed API amounts', () => {
    expect(apiToCents('2950000.00')).toBe(295000000)
    expect(apiToCents('-130000.50')).toBe(-13000050)
    expect(apiToCents('0.00')).toBe(0)
  })

  it('round-trips cents to API strings', () => {
    expect(centsToApi(5000050)).toBe('50000.50')
  })

  it('formats API amounts', () => {
    expect(formatApiAmount('50000.00')).toContain('50.000')
  })
})
