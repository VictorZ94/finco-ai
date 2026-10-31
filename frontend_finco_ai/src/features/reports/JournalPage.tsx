import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Fragment } from 'react'
import { useJournal } from '../../hooks/reports/useReports.ts'
import { formatIsoDate } from '../../lib/dates.ts'
import Amount from './components/Amount.tsx'
import ReportCard from './components/ReportCard.tsx'
import { formatPeriod } from './periods.ts'
import { journalCsv } from './reportRows.ts'
import { usePeriod } from './usePeriod.ts'

const AMOUNT_WIDTH = { xs: 96, sm: 150 }
const tabular = { fontVariantNumeric: 'tabular-nums' } as const

/** Libro diario: every entry of the period in date order, with its debit and credit lines. */
export default function JournalPage() {
  const { period } = usePeriod()
  const query = useJournal(period)

  return (
    <ReportCard
      title="General journal"
      subtitle={formatPeriod(period)}
      query={query}
      csv={(data) => ({ filename: `journal_${data.from}_${data.to}.csv`, rows: journalCsv(data) })}
    >
      {(data) =>
        data.entries.length === 0 ? (
          <Typography color="text.secondary">No entries in this period.</Typography>
        ) : (
          <Table size="small" aria-label="General journal" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell align="right" sx={{ width: AMOUNT_WIDTH }}>
                  Debit
                </TableCell>
                <TableCell align="right" sx={{ width: AMOUNT_WIDTH }}>
                  Credit
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.entries.map((entry) => (
                <Fragment key={entry.id}>
                  <TableRow sx={{ bgcolor: 'brand.50', breakInside: 'avoid' }}>
                    <TableCell colSpan={3} sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25, alignItems: 'baseline' }}>
                        <Typography component="span" variant="money" sx={{ fontWeight: 600 }}>
                          #{entry.numbering}
                        </Typography>
                        <Box component="span" sx={{ ...tabular, fontWeight: 500 }}>
                          {formatIsoDate(entry.applied_date)}
                        </Box>
                        {(entry.supplier || entry.description) && (
                          <Box component="span" sx={{ color: 'text.secondary', minWidth: 0, overflowWrap: 'anywhere' }}>
                            {[entry.supplier, entry.description].filter(Boolean).join(' · ')}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  {entry.lines.map((line) => (
                    <TableRow key={line.id}>
                      {/* Credit lines are indented, as in a handwritten journal. */}
                      <TableCell sx={{ pl: Number(line.credit) > 0 ? { xs: 3, sm: 6 } : { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { sm: 1.5 }, minWidth: 0 }}>
                          <Typography component="span" variant="money" sx={{ color: 'text.secondary', flexShrink: 0, fontSize: { xs: '0.8125rem', sm: 'inherit' } }}>
                            {line.account_code}
                          </Typography>
                          <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                            {line.account_name}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Amount value={line.debit} blankZero />
                      </TableCell>
                      <TableCell align="right">
                        <Amount value={line.credit} blankZero />
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              <TableRow sx={{ '& td': { fontWeight: 600, borderTop: 2, borderTopColor: 'brand.300', borderBottom: 'none' } }}>
                <TableCell>Totals · {data.entries.length} entries</TableCell>
                <TableCell align="right">
                  <Amount value={data.total_debit} />
                </TableCell>
                <TableCell align="right">
                  <Amount value={data.total_credit} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )
      }
    </ReportCard>
  )
}
