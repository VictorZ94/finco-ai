import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchSummary } from './dashboardService.ts'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (month: string) => ['dashboard', 'summary', month] as const,
}

export function summaryQueryOptions(month: string) {
  return queryOptions({
    queryKey: dashboardKeys.summary(month),
    queryFn: () => fetchSummary(month),
    // Keep showing the previous month while the next one loads, to avoid layout jumps.
    placeholderData: keepPreviousData,
  })
}
