import { queryOptions } from '@tanstack/react-query'
import { fetchProfile } from './authService.ts'

export const profileKeys = {
  all: ['me'] as const,
  detail: (uid: string) => ['me', uid] as const,
}

/** The signed-in user's profile. The first fetch also registers them (profile + default chart). */
export function profileQueryOptions(uid: string | undefined) {
  return queryOptions({
    queryKey: profileKeys.detail(uid ?? ''),
    queryFn: fetchProfile,
    enabled: Boolean(uid),
    staleTime: Infinity,
  })
}
