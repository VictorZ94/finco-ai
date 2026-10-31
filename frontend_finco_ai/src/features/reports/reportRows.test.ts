import { describe, expect, it } from 'vitest'
import {
  balanceSheetCsv,
  flattenTree,
  generalLedgerCsv,
  incomeStatementCsv,
  journalCsv,
  summaryLines,
} from './reportRows.ts'
import type { IncomeStatement, StatementNode } from './types.ts'

function node(code: string, amount: string, children: StatementNode[] = []): StatementNode {
  return { id: code, code, name: `Account ${code}`, level: code.length > 4 ? 4 : code.length > 2 ? 3 : code.length, amount, children }
}

const income = node('4', '3000000.00', [node('41', '3000000.00', [node('4135', '3000000.00', [node('413505', '3000000.00')])])])
const expenses = node('5', '130000.00', [node('51', '130000.00', [node('5125', '130000.00')])])

const summary: IncomeStatement['summary'] = {
  operating_income: '3000000.00',
  operating_expenses: '130000.00',
  operating_profit: '2870000.00',
  other_income: '0.00',
  other_expenses: '0.00',
  profit_before_tax: '2870000.00',
  income_tax: '0.00',
  net_income: '2870000.00',
}

describe('flattenTree', () => {
  it('lists a tree depth-first', () => {
    expect(flattenTree(income).map((n) => n.code)).toEqual(['4', '41', '4135', '413505'])
    expect(flattenTree(null)).toEqual([])
  })
})

describe('summaryLines', () => {
  it('hides empty non-operating and tax lines', () => {
    expect(summaryLines(summary).map((l) => l.key)).toEqual(['operating_income', 'operating_expenses', 'operating_profit', 'net_income'])
  })

  it('shows them once there is something to show', () => {
    const lines = summaryLines({ ...summary, other_income: '5.00', income_tax: '1.00' })
    expect(lines.map((l) => l.key)).toContain('profit_before_tax')
    expect(lines.map((l) => l.key)).toContain('income_tax')
    expect(lines.at(-1)).toMatchObject({ key: 'net_income', total: true })
  })
})

describe('CSV rows', () => {
  it('income statement: accounts then subtotals, comma decimals', () => {
    const rows = incomeStatementCsv({ from: '2026-10-01', to: '2026-10-31', income, expenses, summary, total_income: '3000000.00', total_expenses: '130000.00' })
    expect(rows[2]).toEqual(['Code', 'Account', 'Level', 'Amount'])
    expect(rows[3]).toEqual(['4', 'Account 4', 1, '3000000,00'])
    expect(rows.at(-1)).toEqual(['', 'Net income', '', '2870000,00'])
  })

  it('balance sheet ends with liabilities and equity', () => {
    const rows = balanceSheetCsv({
      as_of: '2026-10-31',
      assets: node('1', '10.00'),
      liabilities: null,
      equity: null,
      current_result: '10.00',
      prior_results: '0.00',
      total_assets: '10.00',
      total_liabilities: '0.00',
      total_equity: '10.00',
      total_liabilities_and_equity: '10.00',
      difference: '0.00',
      balanced: true,
    })
    expect(rows.at(-1)).toEqual(['', 'Total liabilities and equity', '', '10,00'])
  })

  it('journal writes one row per line plus totals', () => {
    const rows = journalCsv({
      from: '2026-10-01',
      to: '2026-10-31',
      total_debit: '5.00',
      total_credit: '5.00',
      entries: [
        {
          id: 't1',
          numbering: '0001',
          created_at: '',
          applied_date: '2026-10-02',
          supplier: 'Terpel',
          description: null,
          total_debit: '5.00',
          total_credit: '5.00',
          lines: [
            { id: 'l1', account: 'a', account_code: '513503', account_name: 'Gasolina', debit: '5.00', credit: '0.00' },
            { id: 'l2', account: 'b', account_code: '111010', account_name: 'Banco', debit: '0.00', credit: '5.00' },
          ],
        },
      ],
    })
    expect(rows.slice(3, 5)).toEqual([
      ['2026-10-02', '0001', 'Terpel', '', '513503', 'Gasolina', '5,00', '0,00'],
      ['2026-10-02', '0001', 'Terpel', '', '111010', 'Banco', '0,00', '5,00'],
    ])
    expect(rows.at(-1)?.slice(-2)).toEqual(['5,00', '5,00'])
  })

  it('general ledger brackets each account with opening and closing rows', () => {
    const rows = generalLedgerCsv({
      from: '2026-10-01',
      to: '2026-10-31',
      accounts: [
        {
          id: 'a',
          code: '111010',
          name: 'Banco',
          nature: 'DEBIT',
          opening: '100.00',
          debit: '50.00',
          credit: '0.00',
          closing: '150.00',
          lines: [{ id: 'l', transaction_id: 't', date: '2026-10-03', numbering: '0002', description: '', supplier: 'Mamá', debit: '50.00', credit: '0.00', balance: '150.00' }],
        },
      ],
    })
    expect(rows.slice(3).map((row) => row[4])).toEqual(['Opening balance', 'Mamá', 'Closing balance'])
    expect(rows.at(-1)?.at(-1)).toBe('150,00')
  })
})
