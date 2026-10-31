import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAccounts } from '../../hooks/ledger/useLedgerQueries.ts'
import { useGeneralLedger } from '../../hooks/reports/useReports.ts'
import { formatIsoDate } from '../../lib/dates.ts'
import Amount from './components/Amount.tsx'
import ReportCard from './components/ReportCard.tsx'
import { formatPeriod } from './periods.ts'
import { generalLedgerCsv } from './reportRows.ts'
import type { LedgerAccount } from './types.ts'
import { usePeriod } from './usePeriod.ts'

const ALL = 'all'
const tabular = { fontVariantNumeric: 'tabular-nums' } as const
const amountCell = { width: { xs: 104, sm: 140 } }

function AccountLedger({ account, from, to }: { account: LedgerAccount; from: string; to: string }) {
  const edge = { fontWeight: 600, bgcolor: 'brand.50' }
  return (
    <Box component="section" aria-label={`${account.code} ${account.name}`} sx={{ breakInside: 'avoid-page' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', mb: 1 }}>
        <Typography variant="money" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {account.code}
        </Typography>
        <Typography variant="h6" component="h3">
          {account.name}
        </Typography>
      </Stack>
      {/* Five columns don't fit a phone: the table scrolls inside the card, never the page. */}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 600, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120 }}>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right" sx={amountCell}>
                Debit
              </TableCell>
              <TableCell align="right" sx={amountCell}>
                Credit
              </TableCell>
              <TableCell align="right" sx={amountCell}>
                Balance
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ '& td': edge }}>
              <TableCell sx={tabular}>{formatIsoDate(from)}</TableCell>
              <TableCell colSpan={3}>Opening balance</TableCell>
              <TableCell align="right">
                <Amount value={account.opening} />
              </TableCell>
            </TableRow>
            {account.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell sx={tabular}>{formatIsoDate(line.date)}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>
                  <Typography component="span" variant="money" sx={{ color: 'text.secondary', mr: 1 }}>
                    #{line.numbering}
                  </Typography>
                  {line.description || line.supplier || '—'}
                </TableCell>
                <TableCell align="right">
                  <Amount value={line.debit} blankZero />
                </TableCell>
                <TableCell align="right">
                  <Amount value={line.credit} blankZero />
                </TableCell>
                <TableCell align="right">
                  <Amount value={line.balance} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ '& td': { ...edge, borderBottom: 'none' } }}>
              <TableCell sx={tabular}>{formatIsoDate(to)}</TableCell>
              <TableCell>Closing balance</TableCell>
              <TableCell align="right">
                <Amount value={account.debit} />
              </TableCell>
              <TableCell align="right">
                <Amount value={account.credit} />
              </TableCell>
              <TableCell align="right">
                <Amount value={account.closing} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

/** Libro mayor: per account, opening balance, the period's movements with a running balance, and closing balance. */
export default function GeneralLedgerPage() {
  const { period, params, setParam } = usePeriod()
  const account = params.get('account')
  const accounts = useAccounts()
  const query = useGeneralLedger(period, account)

  return (
    <ReportCard
      title="General ledger"
      subtitle={formatPeriod(period)}
      query={query}
      csv={(data) => ({ filename: `general-ledger_${data.from}_${data.to}.csv`, rows: generalLedgerCsv(data) })}
    >
      {(data) => (
        <Stack spacing={4}>
          <TextField
            select
            size="small"
            label="Account"
            value={account ?? ALL}
            onChange={(event) => setParam('account', event.target.value === ALL ? null : event.target.value)}
            sx={{ maxWidth: 420, displayPrint: 'none' }}
          >
            <MenuItem value={ALL}>All accounts with movements</MenuItem>
            {(accounts.data ?? []).map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Box component="span" sx={{ ...tabular, color: 'text.secondary', mr: 1.25 }}>
                  {option.code}
                </Box>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
          {data.accounts.length === 0 ? (
            <Typography color="text.secondary">No balances or movements for this period.</Typography>
          ) : (
            data.accounts.map((item) => <AccountLedger key={item.id} account={item} from={data.from} to={data.to} />)
          )}
        </Stack>
      )}
    </ReportCard>
  )
}
