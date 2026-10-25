import { describe, expect, it } from 'vitest'
import type { Account } from './types.ts'
import { emptyEntry, entrySchema, entryTotals, firstProblem, type EntryFormValues } from './entrySchema.ts'

const bank: Account = { id: 'bank', code: '111005', name: 'Bancolombia', nature: 'DEBIT', account_type: 'ASSET' }
const food: Account = { id: 'food', code: '510505', name: 'Alimentación', nature: 'DEBIT', account_type: 'EXPENSE' }

function entry(lines: EntryFormValues['lines'], overrides: Partial<EntryFormValues> = {}): EntryFormValues {
  return { appliedDate: '2026-10-25', supplier: '  Éxito ', description: ' Lunch ', lines, ...overrides }
}

const balanced = entry([
  { account: food, debit: '50000', credit: '' },
  { account: bank, debit: '', credit: '50000,5' },
  { account: food, debit: '0,5', credit: '' },
])

function messages(values: EntryFormValues) {
  const result = entrySchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('entrySchema', () => {
  it('turns a balanced entry into the API payload', () => {
    expect(entrySchema.parse(balanced)).toEqual({
      applied_date: '2026-10-25',
      supplier: 'Éxito',
      description: 'Lunch',
      lines: [
        { account: 'food', debit: '50000.00', credit: '0.00' },
        { account: 'bank', debit: '0.00', credit: '50000.50' },
        { account: 'food', debit: '0.50', credit: '0.00' },
      ],
    })
  })

  it('rejects a line with both a debit and a credit', () => {
    const values = entry([
      { account: food, debit: '100', credit: '100' },
      { account: bank, debit: '', credit: '' },
    ])
    expect(messages(values)).toContain('Line 1: use a debit or a credit, not both.')
  })

  it('rejects a line without amounts', () => {
    const values = entry([
      { account: food, debit: '100', credit: '' },
      { account: bank, debit: '', credit: '' },
    ])
    expect(messages(values)).toContain('Line 2: enter a debit or a credit amount.')
  })

  it('needs at least 2 lines', () => {
    expect(messages(entry([{ account: food, debit: '100', credit: '' }]))).toContain('An entry needs at least 2 lines.')
  })

  it('rejects unbalanced totals', () => {
    const values = entry([
      { account: food, debit: '100', credit: '' },
      { account: bank, debit: '', credit: '90' },
    ])
    expect(messages(values)).toEqual(['Total debits must equal total credits.'])
  })

  it('needs an account on every line and valid amounts', () => {
    const values = entry([
      { account: null, debit: '100', credit: '' },
      { account: bank, debit: '', credit: '1.234' },
    ])
    expect(messages(values)).toEqual(
      expect.arrayContaining(['Line 1: choose an account.', 'Line 2: amounts are numbers with up to 2 decimals.']),
    )
  })

  it('needs an applied date and a supplier of at most 255 characters', () => {
    const values = { ...balanced, appliedDate: '', supplier: 'x'.repeat(256) }
    expect(messages(values)).toEqual(['Choose an applied date.', 'Use at most 255 characters.'])
  })
})

describe('form helpers', () => {
  it('starts with 2 empty lines and today as the applied date', () => {
    const values = emptyEntry()
    expect(values.lines).toHaveLength(2)
    expect(values.appliedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(firstProblem(values)).toBe('Line 1: choose an account.')
  })

  it('reports no problem for a valid entry', () => {
    expect(firstProblem(balanced)).toBeNull()
  })

  it('totals in cents and ignores invalid amounts', () => {
    expect(entryTotals(balanced.lines)).toEqual({ totalDebit: 5000050, totalCredit: 5000050, difference: 0, isBalanced: true })
    expect(entryTotals([{ account: null, debit: 'abc', credit: '' }]).totalDebit).toBe(0)
  })
})
