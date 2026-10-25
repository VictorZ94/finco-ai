import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveAccentColor } from './authService.ts'
import { profileKeys, profileQueryOptions } from './queries.ts'
import { useAuth } from './useAuth.ts'

export function useProfile() {
  const { user } = useAuth()
  return useQuery(profileQueryOptions(user?.uid))
}

/** Saves the brand color seed (#RRGGBB, or "" for the default) and updates the cached profile. */
export function useSaveAccentColor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveAccentColor,
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.detail(profile.uid), profile),
  })
}
