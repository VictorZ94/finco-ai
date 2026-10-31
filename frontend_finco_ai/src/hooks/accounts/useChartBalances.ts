import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ChartBalances } from "../../features/puc/types.ts";
import { api } from "../../lib/apiClient.ts";
import { endpoints } from "../../lib/endpoints.ts";

export const accountKeys = {
  /** Every accounts query: the postable list and the PUC balances. */
  all: ["accounts"] as const,
  balancesAll: ["accounts", "balances"] as const,
  balances: (month: string) => ["accounts", "balances", month] as const,
};

/** The whole chart with balances as of `month`'s last day. */
export function useChartBalances(month: string) {
  return useQuery({
    queryKey: accountKeys.balances(month),
    queryFn: async () => {
      const { data } = await api.get<ChartBalances>(endpoints.accountBalances(month));
      return data;
    },
    // Keep the previous month on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}
