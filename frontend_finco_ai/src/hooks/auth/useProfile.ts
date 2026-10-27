import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUserProfile } from "../../features/auth/types.ts";
import { useAuth } from "../../features/auth/useAuth.ts";
import { api } from "../../lib/apiClient.ts";
import { endpoints } from "../../lib/endpoints.ts";

export const profileKeys = {
  all: ["me"] as const,
  detail: (uid: string) => ["me", uid] as const,
};

/** The signed-in user's profile. The first fetch also registers them (profile + default chart). */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKeys.detail(user?.uid ?? ""),
    queryFn: async () => {
      const { data } = await api.get<AppUserProfile>(endpoints.me);
      return data;
    },
    enabled: Boolean(user?.uid),
    staleTime: Infinity,
  });
}

/** Saves the brand color seed (#RRGGBB, or "" for the default) and updates the cached profile. */
export function useSaveAccentColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accentColor: string) => {
      const { data } = await api.patch<AppUserProfile>(endpoints.me, {
        accent_color: accentColor,
      });
      return data;
    },
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKeys.detail(profile.uid), profile),
  });
}
