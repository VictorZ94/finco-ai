import { apiToCents } from '../../lib/money.ts'
import type { AccountBalance, AccountNode } from './types.ts'

/** Flat accounts (ordered by code) to the PUC tree. With `hideZero`, a zero row stays only to hold non-zero children. */
export function buildTree(accounts: AccountBalance[], hideZero = false): AccountNode[] {
  const nodes = new Map(accounts.map((account) => [account.id, { account, children: [] as AccountNode[] }]))
  const roots: AccountNode[] = []
  for (const node of nodes.values()) {
    const parent = node.account.parent_id ? nodes.get(node.account.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return hideZero ? prune(roots) : roots
}

function prune(nodes: AccountNode[]): AccountNode[] {
  return nodes.flatMap((node) => {
    const children = prune(node.children)
    const keep = children.length > 0 || apiToCents(node.account.balance) !== 0
    return keep ? [{ ...node, children }] : []
  })
}

export type ExpandMode = 'default' | 'all' | 'none'

/** Default view: every Clase open, so its Grupos show. */
export function expandedByMode(mode: ExpandMode, level: number): boolean {
  if (mode === 'all') return true
  if (mode === 'none') return false
  return level === 1
}

export interface VisibleRow {
  node: AccountNode
  expanded: boolean
}

/** Rows to draw, depth-first, skipping the children of closed rows. `toggled` flips a row from its mode default. */
export function visibleRows(roots: AccountNode[], mode: ExpandMode, toggled: ReadonlySet<string>): VisibleRow[] {
  const rows: VisibleRow[] = []
  const walk = (nodes: AccountNode[]) => {
    for (const node of nodes) {
      const expanded = expandedByMode(mode, node.account.level) !== toggled.has(node.account.id)
      rows.push({ node, expanded })
      if (expanded) walk(node.children)
    }
  }
  walk(roots)
  return rows
}
