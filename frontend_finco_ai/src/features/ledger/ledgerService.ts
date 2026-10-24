import { apiFetch } from '../../lib/apiClient.ts'
import type { Account, NewTransaction, Transaction } from './types.ts'

export function fetchPostableAccounts(): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts/?postable=true')
}

export function fetchTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('/api/transactions/')
}

export function createTransaction(payload: NewTransaction): Promise<Transaction> {
  return apiFetch<Transaction>('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
