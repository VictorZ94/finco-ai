import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { apiToCents, formatCents } from '../../../lib/money.ts'
import { danger } from '../../../theme/tokens.ts'
import type { VisibleRow } from '../buildTree.ts'

const WEIGHT = { 1: 600, 2: 600, 3: 500, 4: 400 } as const
const TOGGLE_SIZE = 32

interface AccountTreeProps {
  rows: VisibleRow[]
  onToggle: (id: string) => void
}

function Balance({ value }: { value: string }) {
  const cents = apiToCents(value)
  return (
    <Typography
      component="span"
      variant="money"
      sx={{
        whiteSpace: 'nowrap',
        fontWeight: 'inherit',
        color: cents < 0 ? danger.main : cents === 0 ? 'text.secondary' : 'text.primary',
      }}
    >
      {formatCents(cents)}
    </Typography>
  )
}

/** The PUC as an indented tree table: Clase → Grupo → Cuenta → Subcuenta, each with its rolled-up balance. */
export default function AccountTree({ rows, onToggle }: AccountTreeProps) {
  return (
    <Table size="small" aria-label="Chart of accounts" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow>
          <TableCell>Account</TableCell>
          <TableCell align="right" sx={{ width: { xs: 112, sm: 200 } }}>
            Balance
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ node, expanded }) => {
          const { account, children } = node
          const label = `${account.code} ${account.name}`
          return (
            <TableRow
              key={account.id}
              hover
              sx={{
                bgcolor: account.level === 1 ? 'brand.50' : undefined,
                '& > td': { fontWeight: WEIGHT[account.level], py: 0.75 },
              }}
            >
              <TableCell sx={{ pl: { xs: 0.5, sm: 1 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 0,
                    pl: { xs: (account.level - 1) * 1, sm: (account.level - 1) * 3 },
                  }}
                >
                  {children.length > 0 ? (
                    <IconButton
                      size="small"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
                      onClick={() => onToggle(account.id)}
                      sx={{ width: TOGGLE_SIZE, height: TOGGLE_SIZE, flexShrink: 0, color: 'brand.600' }}
                    >
                      <ChevronRightIcon
                        fontSize="small"
                        sx={{ transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'none' }}
                      />
                    </IconButton>
                  ) : (
                    <Box sx={{ width: TOGGLE_SIZE, height: TOGGLE_SIZE, flexShrink: 0 }} />
                  )}
                  {/* Phones: code above a wrapping name. Wider screens: one line, the name truncates. */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { sm: 'center' },
                      gap: { sm: 0.5 },
                      minWidth: 0,
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
                      {account.code}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: { xs: 'normal', sm: 'nowrap' },
                        overflowWrap: 'anywhere',
                      }}
                      title={account.name}
                    >
                      {account.name}
                    </Box>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ pr: { xs: 1, sm: 2 } }}>
                <Balance value={account.balance} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
