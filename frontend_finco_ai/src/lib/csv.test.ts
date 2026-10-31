import { describe, expect, it } from 'vitest'
import { csvAmount, toCsv } from './csv.ts'

describe('toCsv', () => {
  it('joins cells with ; and rows with CRLF', () => {
    expect(toCsv([['Code', 'Account'], ['1', 'Activo']])).toBe('Code;Account\r\n1;Activo')
  })

  it('quotes cells that hold separators, quotes or line breaks', () => {
    expect(toCsv([['a;b', 'say "hi"', 'two\nlines', null, 5]])).toBe('"a;b";"say ""hi""";"two\nlines";;5')
  })
})

it('writes amounts with a decimal comma', () => {
  expect(csvAmount('3000000.00')).toBe('3000000,00')
  expect(csvAmount('-130000.50')).toBe('-130000,50')
})
