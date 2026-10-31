import type { Transaction } from '../ledger/types.ts'

export interface Period {
  /** YYYY-MM-DD */
  from: string
  /** YYYY-MM-DD; the balance sheet's cut-off date. */
  to: string
}

/** One account in a statement, its amount signed by nature; zero branches are left out by the API. */
export interface StatementNode {
  id: string
  code: string
  name: string
  level: number
  amount: string
  children: StatementNode[]
}

export type SummaryKey =
  | 'operating_income'
  | 'operating_expenses'
  | 'operating_profit'
  | 'other_income'
  | 'other_expenses'
  | 'profit_before_tax'
  | 'income_tax'
  | 'net_income'

export interface IncomeStatement {
  from: string
  to: string
  income: StatementNode | null
  expenses: StatementNode | null
  summary: Record<SummaryKey, string>
  total_income: string
  total_expenses: string
}

export interface BalanceSheet {
  as_of: string
  assets: StatementNode | null
  liabilities: StatementNode | null
  equity: StatementNode | null
  current_result: string
  prior_results: string
  total_assets: string
  total_liabilities: string
  total_equity: string
  total_liabilities_and_equity: string
  difference: string
  balanced: boolean
}

export interface Journal {
  from: string
  to: string
  entries: Transaction[]
  total_debit: string
  total_credit: string
}

export interface LedgerLine {
  id: string
  transaction_id: string
  date: string
  numbering: string
  description: string
  supplier: string
  debit: string
  credit: string
  /** Running balance after this line, signed by the account's nature. */
  balance: string
}

export interface LedgerAccount {
  id: string
  code: string
  name: string
  nature: 'DEBIT' | 'CREDIT'
  opening: string
  debit: string
  credit: string
  closing: string
  lines: LedgerLine[]
}

export interface GeneralLedger {
  from: string
  to: string
  accounts: LedgerAccount[]
}
