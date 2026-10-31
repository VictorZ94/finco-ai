import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  BalanceSheet,
  GeneralLedger,
  IncomeStatement,
  Journal,
  Period,
} from "../../features/reports/types.ts";
import { api } from "../../lib/apiClient.ts";
import { endpoints } from "../../lib/endpoints.ts";

export const reportKeys = {
  all: ["reports"] as const,
  incomeStatement: (p: Period) => ["reports", "income-statement", p.from, p.to] as const,
  balanceSheet: (asOf: string) => ["reports", "balance-sheet", asOf] as const,
  journal: (p: Period) => ["reports", "journal", p.from, p.to] as const,
  generalLedger: (p: Period, account: string | null) =>
    ["reports", "general-ledger", p.from, p.to, account ?? "all"] as const,
};

const range = (p: Period) => ({ from: p.from, to: p.to });

// Every report keeps the previous result on screen while a new period loads.

export function useIncomeStatement(period: Period) {
  return useQuery({
    queryKey: reportKeys.incomeStatement(period),
    queryFn: async () => {
      const { data } = await api.get<IncomeStatement>(endpoints.reports.incomeStatement, { params: range(period) });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useBalanceSheet(asOf: string) {
  return useQuery({
    queryKey: reportKeys.balanceSheet(asOf),
    queryFn: async () => {
      const { data } = await api.get<BalanceSheet>(endpoints.reports.balanceSheet, { params: { as_of: asOf } });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useJournal(period: Period) {
  return useQuery({
    queryKey: reportKeys.journal(period),
    queryFn: async () => {
      const { data } = await api.get<Journal>(endpoints.reports.journal, { params: range(period) });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** `account` null = every account with a balance or movements. */
export function useGeneralLedger(period: Period, account: string | null) {
  return useQuery({
    queryKey: reportKeys.generalLedger(period, account),
    queryFn: async () => {
      const { data } = await api.get<GeneralLedger>(endpoints.reports.generalLedger, {
        params: { ...range(period), ...(account ? { account } : {}) },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
