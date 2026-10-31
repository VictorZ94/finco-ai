export const endpoints = {
  dashboard: {
    summary: (month: string) => `/dashboard/summary/?month=${month}`,
  },
  accounts: "/accounts/",
  transactions: "/transactions/",
  me: "/me/",
  chat: {
    conversations: "/chat/conversations/",
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages/`,
    proposal: (conversationId: string) => `/chat/conversations/${conversationId}/account-proposal/`,
  },
};
