import { describe, expect, it } from 'vitest'
import { buildTree, visibleRows } from './buildTree.ts'
import type { AccountBalance } from './types.ts'

function account(id: string, level: AccountBalance['level'], parent: string | null, balance = '0.00'): AccountBalance {
  return {
    id,
    code: id,
    name: id,
    level,
    nature: 'DEBIT',
    account_type: 'ASSET',
    parent_id: parent,
    can_receive_movement: level === 4,
    debit: balance,
    credit: '0.00',
    balance,
  }
}

const chart = [
  account('1', 1, null, '300.00'),
  account('11', 2, '1', '300.00'),
  account('1105', 3, '11'),
  account('110505', 4, '1105'),
  account('1110', 3, '11', '300.00'),
  account('111010', 4, '1110', '100.00'),
  account('111015', 4, '1110', '200.00'),
  account('2', 1, null),
]

const codes = (rows: ReturnType<typeof visibleRows>) => rows.map((row) => row.node.account.code)

describe('buildTree', () => {
  it('nests accounts under their parents', () => {
    const roots = buildTree(chart)
    expect(roots.map((n) => n.account.code)).toEqual(['1', '2'])
    expect(roots[0].children[0].children.map((n) => n.account.code)).toEqual(['1105', '1110'])
  })

  it('hides zero rows but keeps the parents of non-zero ones', () => {
    const roots = buildTree(chart, true)
    expect(roots.map((n) => n.account.code)).toEqual(['1'])
    expect(roots[0].children[0].children.map((n) => n.account.code)).toEqual(['1110'])
  })

  it('treats a negative balance as non-zero', () => {
    expect(buildTree([account('9', 1, null, '-5.00')], true)).toHaveLength(1)
  })
})

describe('visibleRows', () => {
  const roots = buildTree(chart)

  it('opens only the Clases by default', () => {
    expect(codes(visibleRows(roots, 'default', new Set()))).toEqual(['1', '11', '2'])
  })

  it('opens a toggled row and closes a toggled Clase', () => {
    expect(codes(visibleRows(roots, 'default', new Set(['11'])))).toEqual(['1', '11', '1105', '1110', '2'])
    expect(codes(visibleRows(roots, 'default', new Set(['1'])))).toEqual(['1', '2'])
  })

  it('expands or collapses everything', () => {
    expect(visibleRows(roots, 'all', new Set())).toHaveLength(chart.length)
    expect(codes(visibleRows(roots, 'none', new Set()))).toEqual(['1', '2'])
  })
})
