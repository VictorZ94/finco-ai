import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

// The client imports Firebase; these tests only need the error conversion.
vi.mock('./firebase.ts', () => ({ auth: null }))
const { ApiError, toApiError } = await import('./apiClient.ts')

function httpError(status: number, data: unknown) {
  const response = { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('toApiError', () => {
  it('flattens nested DRF errors and labels lines', () => {
    const error = toApiError(
      httpError(400, { lines: { '0': { non_field_errors: ['Use a debit or a credit.'] } }, applied_date: ['Required.'] }),
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.messages).toEqual(['Line 1: Use a debit or a credit.', 'applied_date: Required.'])
  })

  it('removes duplicated messages', () => {
    expect(toApiError(httpError(400, { detail: ['Bad', 'Bad'] })).messages).toEqual(['Bad'])
  })

  it('explains a non-JSON error (backend down behind the dev proxy)', () => {
    expect(toApiError(httpError(502, '<html>Bad gateway</html>')).messages).toEqual([
      'Request failed (502). Is the backend running?',
    ])
  })

  it('explains a network error', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect(error.status).toBe(0)
    expect(error.messages).toEqual(['Could not reach the server. Is the backend running?'])
  })

  it('passes an ApiError through unchanged', () => {
    const original = new ApiError(401, ['Please sign in again.'])
    expect(toApiError(original)).toBe(original)
  })
})
