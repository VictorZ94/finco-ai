import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '../dashboard/queries.ts'
import { createTransaction } from './ledgerService.ts'
import { ledgerKeys, postableAccountsQueryOptions, transactionsQueryOptions } from './queries.ts'
import type { Transaction } from './types.ts'

/** Accounts that can receive movements (leaf accounts). */
export function useAccounts() {
  return useQuery(postableAccountsQueryOptions)
}

/** Saved entries, newest first. */
export function useTransactions() {
  return useQuery(transactionsQueryOptions)
}

/** Saves an entry; the list shows it at once and the dashboard refetches on its next visit. */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (created) => {
      queryClient.setQueryData<Transaction[]>(ledgerKeys.transactions, (prev) => [created, ...(prev ?? [])])
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
