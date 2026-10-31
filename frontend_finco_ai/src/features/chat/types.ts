import type { Transaction } from '../ledger/types.ts'

export type Role = 'user' | 'assistant'

export interface AccountRef {
  code: string
  name: string
}

/** Card under an assistant message: the entry the agent saved. */
export interface RecordedCard {
  type: 'recorded'
  transaction_id: string
  numbering: string
  applied_date: string
  supplier: string
  description: string
  amount: string
  debit: AccountRef
  credit: AccountRef
}

/** Card under an assistant message: a new account the agent wants to create. */
export interface AccountProposalCard {
  type: 'account_proposal'
  code: string
  name: string
  parent_code: string
  parent_name: string
  account_type: string
  role: 'category' | 'payment'
  status: 'pending' | 'accepted' | 'declined'
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  data: RecordedCard | AccountProposalCard | null
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

/** What sending a message (or answering a proposal) returns. */
export interface TurnResponse {
  messages: ChatMessage[]
  transaction: Transaction | null
}
