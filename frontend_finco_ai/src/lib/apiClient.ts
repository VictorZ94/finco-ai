import axios, { isAxiosError } from 'axios'
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

/** Turns any request failure into an ApiError with messages fit to show the user. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const status = isAxiosError(error) ? (error.response?.status ?? 0) : 0
  // An HTML body (e.g. the dev proxy's page when the backend is down) yields no messages.
  const body: unknown = isAxiosError(error) ? error.response?.data : null
  const messages = typeof body === 'object' ? collectMessages(body) : []
  if (messages.length > 0) return new ApiError(status, [...new Set(messages)])
  return new ApiError(status, [
    status ? `Request failed (${status}). Is the backend running?` : 'Could not reach the server. Is the backend running?',
  ])
}

/** The FincoAI API. Every request carries the signed-in user's Firebase ID token (refreshed by the SDK). */
export const api = axios.create({ baseURL: '/api', headers: { Accept: 'application/json' } })

api.interceptors.request.use(async (config) => {
  const user = auth?.currentUser
  if (!user) throw new ApiError(401, ['Please sign in again.'])
  config.headers.set('Authorization', `Bearer ${await user.getIdToken()}`)
  return config
})

api.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = toApiError(error)
  if (apiError.status === 401 && auth?.currentUser) {
    // The backend rejected the token: end the session; the route guard shows the login page.
    await signOut(auth)
  }
  throw apiError
})
