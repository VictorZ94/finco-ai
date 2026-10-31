import { describe, expect, it } from 'vitest'
import { entryRows, proposalOutcome } from './cards.ts'
import type { AccountProposalCard, RecordedCard } from './types.ts'

const recorded: RecordedCard = {
  type: 'recorded',
  transaction_id: 't1',
  numbering: '0007',
  applied_date: '2026-10-27',
  supplier: 'Terpel',
  description: '',
  amount: '80000.00',
  debit: { code: '5135-03', name: 'Gasolina' },
  credit: { code: '2105-02', name: 'Tarjeta de Crédito Nubank' },
}

const proposal: AccountProposalCard = {
  type: 'account_proposal',
  code: '5135-04',
  name: 'Taxi',
  parent_code: '5135',
  parent_name: 'Servicios',
  account_type: 'EXPENSE',
  role: 'category',
  status: 'pending',
}

describe('chat cards', () => {
  it('shows a saved entry as one debit and one credit of the same amount', () => {
    const rows = entryRows(recorded)
    expect(rows.map((row) => [row.side, row.code, row.name])).toEqual([
      ['Debit', '5135-03', 'Gasolina'],
      ['Credit', '2105-02', 'Tarjeta de Crédito Nubank'],
    ])
    expect(rows[0].amount).toBe(rows[1].amount)
    expect(rows[0].amount).toMatch(/80\.000/)
  })

  it('describes the answer to a proposal', () => {
    expect(proposalOutcome(proposal)).toBeNull()
    expect(proposalOutcome({ ...proposal, status: 'accepted' })).toBe('Created 5135-04 Taxi')
    expect(proposalOutcome({ ...proposal, status: 'declined' })).toBe('Not created')
  })
})
