export const endpoints = {
  dashboard: {
    summary: (month: string) => `/dashboard/summary/?month=${month}`,
  },
  accounts: "/accounts/",
  transactions: "/transactions/",
  me: "/me/",
};
