import { useEffect, useState } from 'react'
import { ApiError, createTransaction, fetchPostableAccounts, fetchTransactions } from './ledgerService.ts'
import type { Account, NewTransaction, Transaction } from './types.ts'

function toMessages(error: unknown): string[] {
  if (error instanceof ApiError) return error.messages
  return ['Could not reach the server. Is the backend running?']
}

function fetchLedger() {
  return Promise.all([fetchPostableAccounts(), fetchTransactions()])
}

/** Loads the postable accounts and saved entries, and saves new entries. */
export function useLedgerData() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string[] | null>(null)

  function applyResult(promise: ReturnType<typeof fetchLedger>, isActive = () => true) {
    promise
      .then(([accountList, transactionList]) => {
        if (!isActive()) return
        setAccounts(accountList)
        setTransactions(transactionList)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (isActive()) setLoadError(toMessages(error))
      })
      .finally(() => {
        if (isActive()) setIsLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    applyResult(fetchLedger(), () => active)
    return () => {
      active = false
    }
  }, [])

  function reload() {
    setIsLoading(true)
    setLoadError(null)
    applyResult(fetchLedger())
  }

  /** Saves the entry; resolves to the created entry or rejects with the server's messages. */
  async function save(payload: NewTransaction): Promise<Transaction> {
    try {
      const created = await createTransaction(payload)
      setTransactions((prev) => [created, ...prev])
      return created
    } catch (error) {
      throw toMessages(error)
    }
  }

  return { accounts, transactions, isLoading, loadError, reload, save }
}
