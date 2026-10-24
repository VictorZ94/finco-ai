import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/apiClient.ts'
import { fetchSummary } from './dashboardService.ts'
import type { DashboardSummary } from './types.ts'

interface DashboardState {
  month: string | null // month the current data/error belongs to
  data: DashboardSummary | null
  error: string[] | null
}

/** Loads the summary for `month`; responses for a month the user already left are ignored. */
export function useDashboard(month: string) {
  const [state, setState] = useState<DashboardState>({ month: null, data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchSummary(month)
      .then((data) => {
        if (active) setState({ month, data, error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        const messages = error instanceof ApiError ? error.messages : ['Could not reach the server. Is the backend running?']
        setState({ month, data: null, error: messages })
      })
    return () => {
      active = false
    }
  }, [month, attempt])

  const isCurrent = state.month === month
  return {
    // Keep showing the previous month's data while the next one loads, to avoid layout jumps.
    data: state.data,
    error: isCurrent ? state.error : null,
    isLoading: !isCurrent,
    retry: () => setAttempt((n) => n + 1),
  }
}
