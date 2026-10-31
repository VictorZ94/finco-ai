export const endpoints = {
  dashboard: {
    summary: (month: string) => `/dashboard/summary/?month=${month}`,
  },
  accounts: "/accounts/",
  accountBalances: (month: string) => `/accounts/balances/?month=${month}`,
  transactions: "/transactions/",
  me: "/me/",
  reports: {
    incomeStatement: "/reports/income-statement/",
    balanceSheet: "/reports/balance-sheet/",
    journal: "/reports/journal/",
    generalLedger: "/reports/general-ledger/",
  },
  chat: {
    conversations: "/chat/conversations/",
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages/`,
    proposal: (conversationId: string) => `/chat/conversations/${conversationId}/account-proposal/`,
  },
};
