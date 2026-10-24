import { apiFetch } from '../../lib/apiClient.ts'
import type { DashboardSummary } from './types.ts'

export function fetchSummary(month: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/api/dashboard/summary/?month=${encodeURIComponent(month)}`)
}
