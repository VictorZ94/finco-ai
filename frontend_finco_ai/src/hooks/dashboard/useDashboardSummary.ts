import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "../../features/dashboard/types.ts";
import { api } from "../../lib/apiClient.ts";
import { endpoints } from "../../lib/endpoints.ts";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (month: string) => ["dashboard", "summary", month] as const,
};

/** The summary for `month`. `isPlaceholderData` is true while the previous month is still on screen. */
export function useDashboardSummary(month: string) {
  return useQuery({
    queryKey: dashboardKeys.summary(month),
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>(
        endpoints.dashboard.summary(month),
      );
      return data;
    },
    // Keep showing the previous month while the next one loads, to avoid layout jumps.
    placeholderData: keepPreviousData,
  });
}
