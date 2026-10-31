import { csvAmount, type CsvCell } from '../../lib/csv.ts'
import { apiToCents } from '../../lib/money.ts'
import type { BalanceSheet, GeneralLedger, IncomeStatement, Journal, StatementNode, SummaryKey } from './types.ts'

/** A statement tree as rows, depth-first (the API already dropped zero branches). */
export function flattenTree(node: StatementNode | null): StatementNode[] {
  if (!node) return []
  return [node, ...node.children.flatMap(flattenTree)]
}

export interface SummaryLine {
  key: SummaryKey
  label: string
  amount: string
  /** Subtotals and the result: bold, with a rule above. */
  total: boolean
}

const SUMMARY: { key: SummaryKey; label: string; total: boolean }[] = [
  { key: 'operating_income', label: 'Operating income', total: false },
  { key: 'operating_expenses', label: 'Operating expenses', total: false },
  { key: 'operating_profit', label: 'Operating profit', total: true },
  { key: 'other_income', label: 'Non-operating income', total: false },
  { key: 'other_expenses', label: 'Non-operating expenses', total: false },
  { key: 'profit_before_tax', label: 'Profit before tax', total: true },
  { key: 'income_tax', label: 'Income tax', total: false },
  { key: 'net_income', label: 'Net income', total: true },
]

/** The income statement's subtotals. Non-operating lines and taxes show only when they have amounts. */
export function summaryLines(summary: IncomeStatement['summary']): SummaryLine[] {
  const zero = (key: SummaryKey) => apiToCents(summary[key]) === 0
  const hasOther = !zero('other_income') || !zero('other_expenses')
  const hasTax = !zero('income_tax')
  return SUMMARY.filter(({ key }) => {
    if (key === 'other_income' || key === 'other_expenses') return hasOther
    if (key === 'income_tax') return hasTax
    if (key === 'profit_before_tax') return hasOther || hasTax
    return true
  }).map((line) => ({ ...line, amount: summary[line.key] }))
}

const treeRows = (node: StatementNode | null): CsvCell[][] =>
  flattenTree(node).map((row) => [row.code, row.name, row.level, csvAmount(row.amount)])

export function incomeStatementCsv(data: IncomeStatement): CsvCell[][] {
  return [
    ['Income statement', `${data.from} to ${data.to}`],
    [],
    ['Code', 'Account', 'Level', 'Amount'],
    ...treeRows(data.income),
    ...treeRows(data.expenses),
    [],
    ...summaryLines(data.summary).map((line) => ['', line.label, '', csvAmount(line.amount)]),
  ]
}

export function balanceSheetCsv(data: BalanceSheet): CsvCell[][] {
  return [
    ['Balance sheet', `as of ${data.as_of}`],
    [],
    ['Code', 'Account', 'Level', 'Amount'],
    ...treeRows(data.assets),
    ['', 'Total assets', '', csvAmount(data.total_assets)],
    ...treeRows(data.liabilities),
    ['', 'Total liabilities', '', csvAmount(data.total_liabilities)],
    ...treeRows(data.equity),
    ['', 'Prior years’ results', '', csvAmount(data.prior_results)],
    ['', 'Result for the year', '', csvAmount(data.current_result)],
    ['', 'Total equity', '', csvAmount(data.total_equity)],
    ['', 'Total liabilities and equity', '', csvAmount(data.total_liabilities_and_equity)],
  ]
}

export function journalCsv(data: Journal): CsvCell[][] {
  return [
    ['General journal', `${data.from} to ${data.to}`],
    [],
    ['Date', 'No.', 'Supplier', 'Description', 'Code', 'Account', 'Debit', 'Credit'],
    ...data.entries.flatMap((entry) =>
      entry.lines.map((line) => [
        entry.applied_date,
        entry.numbering,
        entry.supplier,
        entry.description ?? '',
        line.account_code,
        line.account_name,
        csvAmount(line.debit),
        csvAmount(line.credit),
      ]),
    ),
    ['', '', '', 'Totals', '', '', csvAmount(data.total_debit), csvAmount(data.total_credit)],
  ]
}

export function generalLedgerCsv(data: GeneralLedger): CsvCell[][] {
  return [
    ['General ledger', `${data.from} to ${data.to}`],
    [],
    ['Code', 'Account', 'Date', 'No.', 'Description', 'Debit', 'Credit', 'Balance'],
    ...data.accounts.flatMap((account) => [
      [account.code, account.name, data.from, '', 'Opening balance', '', '', csvAmount(account.opening)],
      ...account.lines.map((line) => [
        account.code,
        account.name,
        line.date,
        line.numbering,
        line.description || line.supplier,
        csvAmount(line.debit),
        csvAmount(line.credit),
        csvAmount(line.balance),
      ]),
      [
        account.code,
        account.name,
        data.to,
        '',
        'Closing balance',
        csvAmount(account.debit),
        csvAmount(account.credit),
        csvAmount(account.closing),
      ],
    ]),
  ]
}
