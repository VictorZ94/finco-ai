export interface Account {
  id: string
  code: string
  name: string
  nature: 'DEBIT' | 'CREDIT'
  account_type: string
}

/** One editable row of the entry form. Amounts are the raw text the user typed. */
export interface LedgerLine {
  key: string
  account: Account | null
  debit: string
  credit: string
}

export interface TransactionLine {
  id: string
  account: string
  account_code: string
  account_name: string
  debit: string
  credit: string
}

export interface Transaction {
  id: string
  numbering: string
  created_at: string
  applied_date: string
  supplier: string
  description: string | null
  lines: TransactionLine[]
  total_debit: string
  total_credit: string
}

export interface NewTransaction {
  applied_date: string
  supplier: string
  description: string
  lines: { account: string; debit: string; credit: string }[]
}
