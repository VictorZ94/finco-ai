import type { Account, NewTransaction, Transaction } from './types.ts'

/** Error carrying the human-readable messages from a DRF validation response. */
export class ApiError extends Error {
  readonly messages: string[]

  constructor(messages: string[]) {
    super(messages.join(' '))
    this.messages = messages
  }
}

// DRF nests errors by field and line index ({"lines": {"0": {"non_field_errors": [...]}}}); flatten them.
function collectMessages(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return [path ? `${path}: ${value}` : value]
  if (Array.isArray(value)) return value.flatMap((item) => collectMessages(item, path))
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => {
      let label = key
      if (key === 'non_field_errors' || key === 'lines') label = path
      else if (/^\d+$/.test(key)) label = `Line ${Number(key) + 1}`
      return collectMessages(item, label)
    })
  }
  return []
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (response.ok) return (await response.json()) as T

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON error (e.g. the backend is down and the dev proxy returned HTML).
  }
  const messages = collectMessages(body)
  throw new ApiError(
    messages.length > 0 ? [...new Set(messages)] : [`Request failed (${response.status}). Is the backend running?`],
  )
}

export function fetchPostableAccounts(): Promise<Account[]> {
  return request<Account[]>('/api/accounts/?postable=true')
}

export function fetchTransactions(): Promise<Transaction[]> {
  return request<Transaction[]>('/api/transactions/')
}

export function createTransaction(payload: NewTransaction): Promise<Transaction> {
  return request<Transaction>('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
