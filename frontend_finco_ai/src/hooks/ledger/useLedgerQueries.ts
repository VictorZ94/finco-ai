import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Account,
  NewTransaction,
  Transaction,
} from "../../features/ledger/types.ts";
import { api } from "../../lib/apiClient.ts";
import { endpoints } from "../../lib/endpoints.ts";
import { accountKeys } from "../accounts/useChartBalances.ts";
import { dashboardKeys } from "../dashboard/useDashboardSummary.ts";

export const ledgerKeys = {
  postableAccounts: ["accounts", "postable"] as const,
  transactions: ["transactions"] as const,
};

/** Accounts that can receive movements (leaf accounts). */
export function useAccounts() {
  return useQuery({
    queryKey: ledgerKeys.postableAccounts,
    queryFn: async () => {
      const { data } = await api.get<Account[]>(endpoints.accounts, {
        params: { postable: true },
      });
      return data;
    },
  });
}

/** Saved entries, newest first. */
export function useTransactions() {
  return useQuery({
    queryKey: ledgerKeys.transactions,
    queryFn: async () => {
      const { data } = await api.get<Transaction[]>(endpoints.transactions);
      return data;
    },
  });
}

/** Saves an entry; the list shows it at once and the dashboard and PUC refetch on their next visit. */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewTransaction) => {
      const { data } = await api.post<Transaction>(
        endpoints.transactions,
        payload,
      );
      return data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Transaction[]>(
        ledgerKeys.transactions,
        (prev) => [created, ...(prev ?? [])],
      );
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.balancesAll });
    },
  });
}
