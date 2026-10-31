import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  ChatMessage,
  Conversation,
  TurnResponse,
} from "../../features/chat/types.ts";
import { api } from "../../lib/apiClient.ts";
import { todayIso } from "../../lib/dates.ts";
import { endpoints } from "../../lib/endpoints.ts";
import { dashboardKeys } from "../dashboard/useDashboardSummary.ts";
import { ledgerKeys } from "../ledger/useLedgerQueries.ts";

export const chatKeys = {
  conversations: ["chat", "conversations"] as const,
  messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
};

/** The user's latest conversations, newest first. */
export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>(endpoints.chat.conversations);
      return data;
    },
  });
}

/** A conversation's messages, oldest first. */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? ""),
    queryFn: async () => {
      const { data } = await api.get<ChatMessage[]>(endpoints.chat.messages(conversationId!));
      return data;
    },
    enabled: Boolean(conversationId),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Conversation>(endpoints.chat.conversations);
      return data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.conversations, (prev) => [created, ...(prev ?? [])]);
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(created.id), []);
    },
  });
}

/** Adds the turn's messages to the cache; a saved entry or a new account refreshes the ledger and dashboard. */
function applyTurn(queryClient: QueryClient, conversationId: string, turn: TurnResponse, dropId?: string) {
  queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(conversationId), (prev) => [
    ...(prev ?? []).filter((message) => message.id !== dropId),
    ...turn.messages,
  ]);
  void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
  if (turn.transaction) {
    void queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }
}

interface SendVariables {
  conversationId: string;
  content: string;
  // Also the optimistic message's id; the server uses it to ignore a retried request.
  clientId: string;
}

/** Sends a message; it shows at once, and the agent's reply (and any saved entry) follows. */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content, clientId }: SendVariables) => {
      const { data } = await api.post<TurnResponse>(endpoints.chat.messages(conversationId), {
        content,
        client_id: clientId,
        today: todayIso(),
      });
      return data;
    },
    onMutate: ({ conversationId, content, clientId }) => {
      const optimistic: ChatMessage = {
        id: clientId,
        role: "user",
        content,
        data: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(conversationId), (prev) => [
        ...(prev ?? []),
        optimistic,
      ]);
    },
    onSuccess: (turn, { conversationId, clientId }) => applyTurn(queryClient, conversationId, turn, clientId),
    // The server may have kept the user message (e.g. the model was down): show what it has.
    onError: (_error, { conversationId }) =>
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
  });
}

/** Answers the pending "create account?" card; the agent then continues (usually saving the entry). */
export function useAnswerProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, accept }: { conversationId: string; accept: boolean }) => {
      const { data } = await api.post<TurnResponse>(endpoints.chat.proposal(conversationId), {
        accept,
        today: todayIso(),
      });
      return data;
    },
    onSuccess: (turn, { conversationId, accept }) => {
      // Mirror the server: the answered card stops offering its buttons.
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(conversationId), (prev) =>
        (prev ?? []).map((message) =>
          message.data?.type === "account_proposal" && message.data.status === "pending"
            ? { ...message, data: { ...message.data, status: accept ? "accepted" : "declined" } }
            : message,
        ),
      );
      applyTurn(queryClient, conversationId, turn);
      if (accept) void queryClient.invalidateQueries({ queryKey: ledgerKeys.postableAccounts });
    },
  });
}
