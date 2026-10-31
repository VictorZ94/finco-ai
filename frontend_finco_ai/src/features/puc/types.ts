export interface AccountBalance {
  id: string
  code: string
  name: string
  level: 1 | 2 | 3 | 4
  nature: 'DEBIT' | 'CREDIT'
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  parent_id: string | null
  can_receive_movement: boolean
  debit: string
  credit: string
  /** Signed by the account's nature; parents add up their children. */
  balance: string
}

export interface ChartBalances {
  month: string
  as_of: string
  accounts: AccountBalance[]
}

export interface AccountNode {
  account: AccountBalance
  children: AccountNode[]
}
