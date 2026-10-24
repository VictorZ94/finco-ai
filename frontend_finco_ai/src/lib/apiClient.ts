import { signOut } from 'firebase/auth'
import { auth } from './firebase.ts'

/** Error carrying the human-readable messages from an API (DRF) error response. */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join(' '))
    this.status = status
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
      if (key === 'non_field_errors' || key === 'lines' || key === 'detail') label = path
      else if (/^\d+$/.test(key)) label = `Line ${Number(key) + 1}`
      return collectMessages(item, label)
    })
  }
  return []
}

/**
 * fetch() for the FincoAI API: sends the signed-in user's Firebase ID token
 * (refreshed automatically by the SDK) and turns error responses into ApiError.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const user = auth?.currentUser
  if (!user) throw new ApiError(401, ['Please sign in again.'])

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
  })
  if (response.ok) return (await response.json()) as T

  if (response.status === 401 && auth) {
    // The backend rejected the token: end the session; the route guard shows the login page.
    await signOut(auth)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON error (e.g. the backend is down and the dev proxy returned HTML).
  }
  const messages = collectMessages(body)
  throw new ApiError(
    response.status,
    messages.length > 0 ? [...new Set(messages)] : [`Request failed (${response.status}). Is the backend running?`],
  )
}
