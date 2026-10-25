import { api } from '../../lib/apiClient.ts'
import type { DashboardSummary } from './types.ts'

export async function fetchSummary(month: string): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary/', { params: { month } })
  return data
}
