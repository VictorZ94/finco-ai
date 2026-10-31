import { formatApiAmount } from '../../lib/money.ts'
import type { AccountProposalCard, RecordedCard } from './types.ts'

export interface EntryRow {
  side: 'Debit' | 'Credit'
  code: string
  name: string
  amount: string
}

/** The two lines of a saved entry, ready to display (the agent always saves one debit and one credit). */
export function entryRows(card: RecordedCard): EntryRow[] {
  const amount = formatApiAmount(card.amount)
  return [
    { side: 'Debit', ...card.debit, amount },
    { side: 'Credit', ...card.credit, amount },
  ]
}

/** Shown once the user answered a proposal, in place of its buttons. */
export function proposalOutcome(card: AccountProposalCard): string | null {
  if (card.status === 'accepted') return `Created ${card.code} ${card.name}`
  if (card.status === 'declined') return 'Not created'
  return null
}
