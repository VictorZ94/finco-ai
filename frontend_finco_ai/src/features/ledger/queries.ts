import { queryOptions } from '@tanstack/react-query'
import { fetchPostableAccounts, fetchTransactions } from './ledgerService.ts'

export const ledgerKeys = {
  postableAccounts: ['accounts', 'postable'] as const,
  transactions: ['transactions'] as const,
}

export const postableAccountsQueryOptions = queryOptions({
  queryKey: ledgerKeys.postableAccounts,
  queryFn: fetchPostableAccounts,
})

export const transactionsQueryOptions = queryOptions({
  queryKey: ledgerKeys.transactions,
  queryFn: fetchTransactions,
})
