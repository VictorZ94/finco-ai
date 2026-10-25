import { useQuery } from '@tanstack/react-query'
import { summaryQueryOptions } from './queries.ts'

/** The summary for `month`. `isPlaceholderData` is true while the previous month is still on screen. */
export function useDashboardSummary(month: string) {
  return useQuery(summaryQueryOptions(month))
}
