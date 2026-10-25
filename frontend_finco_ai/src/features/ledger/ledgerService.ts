import { api } from '../../lib/apiClient.ts'
import type { Account, NewTransaction, Transaction } from './types.ts'

export async function fetchPostableAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>('/accounts/', { params: { postable: true } })
  return data
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>('/transactions/')
  return data
}

export async function createTransaction(payload: NewTransaction): Promise<Transaction> {
  const { data } = await api.post<Transaction>('/transactions/', payload)
  return data
}
