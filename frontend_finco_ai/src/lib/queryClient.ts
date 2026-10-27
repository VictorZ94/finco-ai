import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './apiClient.ts'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A ledger doesn't change behind the user's back; refetch on mount/invalidation only.
      refetchOnWindowFocus: false,
      // 4xx answers (bad month, expired session) won't change on a retry; network/5xx get one more try.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
    },
  },
})

// Every query/mutation error is an ApiError (the axios interceptor converts them), so `error.messages` is typed.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}
