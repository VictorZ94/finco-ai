import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { flattenTree } from '../reportRows.ts'
import type { StatementNode } from '../types.ts'
import Amount from './Amount.tsx'

const WEIGHT: Record<number, number> = { 1: 600, 2: 600, 3: 500, 4: 400 }

/** A two-column statement table (account | amount). Fill it with StatementTree and StatementLine rows. */
export default function StatementTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Table size="small" aria-label={label} sx={{ tableLayout: 'fixed', '& td': { py: 0.875 } }}>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

/** Every account of a statement tree, indented by PUC level. */
export function StatementTree({ node }: { node: StatementNode | null }) {
  return flattenTree(node).map((row) => (
    <TableRow key={row.id} sx={{ bgcolor: row.level === 1 ? 'brand.50' : undefined }}>
      <TableCell sx={{ fontWeight: WEIGHT[row.level] ?? 400 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { sm: 1.5 },
            minWidth: 0,
            pl: { xs: (row.level - 1) * 1, sm: (row.level - 1) * 2.5 },
          }}
        >
          <Typography
            component="span"
            variant="money"
            sx={{
              color: 'text.secondary',
              fontWeight: 'inherit',
              flexShrink: 0,
              minWidth: { sm: '6.5ch' },
              fontSize: { xs: '0.8125rem', sm: 'inherit' },
            }}
          >
            {row.code}
          </Typography>
          <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {row.name}
          </Box>
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ width: { xs: 120, sm: 180 }, fontWeight: WEIGHT[row.level] ?? 400 }}>
        <Amount value={row.amount} />
      </TableCell>
    </TableRow>
  ))
}

interface StatementLineProps {
  label: string
  amount: string
  /** A subtotal or result: bold with a rule above. */
  total?: boolean
  /** The statement's last line: larger type. */
  grand?: boolean
}

/** A computed line (subtotal, result, total) under the accounts. */
export function StatementLine({ label, amount, total = false, grand = false }: StatementLineProps) {
  const rule = total ? { borderTop: 2, borderTopColor: 'brand.300' } : {}
  const text = { fontWeight: total ? 600 : 400, fontSize: grand ? '1.0625rem' : undefined, ...rule }
  return (
    <TableRow>
      <TableCell sx={text}>{label}</TableCell>
      <TableCell align="right" sx={{ ...text, width: { xs: 120, sm: 180 } }}>
        <Amount value={amount} />
      </TableCell>
    </TableRow>
  )
}
