import { useState } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { formatDateTime, formatIsoDate } from '../../../lib/dates.ts'
import { formatApiAmount } from '../../../lib/money.ts'
import type { Transaction } from '../types.ts'
import { cardSx } from '../../../theme/index.ts'
import { useBrand } from '../../../theme/useBrand.ts'

const tabular = { fontVariantNumeric: 'tabular-nums' } as const

const COLUMN_COUNT = 7

function EntryRow({ entry }: { entry: Transaction }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow hover sx={{ '& > td': { borderBottom: open ? 'unset' : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            aria-label={open ? `Hide lines of entry ${entry.numbering}` : `Show lines of entry ${entry.numbering}`}
            onClick={() => setOpen((value) => !value)}
            sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ ...tabular, color: 'text.secondary' }}>{entry.numbering}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatIsoDate(entry.applied_date)}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {formatDateTime(entry.created_at)}
        </TableCell>
        <TableCell>{entry.supplier || '—'}</TableCell>
        <TableCell>{entry.description || '—'}</TableCell>
        <TableCell align="right" sx={{ ...tabular, whiteSpace: 'nowrap', fontWeight: 600 }}>
          {formatApiAmount(entry.total_debit)}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ my: 1.5, ml: { sm: 6 }, px: 2, py: 1, bgcolor: 'brand.50', borderRadius: '16px' }}>
              <Table size="small" aria-label={`Lines of entry ${entry.numbering}`}>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entry.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Box component="span" sx={{ ...tabular, color: 'text.secondary', mr: 1.25 }}>
                          {line.account_code}
                        </Box>
                        {line.account_name}
                      </TableCell>
                      <TableCell align="right" sx={tabular}>
                        {Number(line.debit) > 0 ? formatApiAmount(line.debit) : ''}
                      </TableCell>
                      <TableCell align="right" sx={tabular}>
                        {Number(line.credit) > 0 ? formatApiAmount(line.credit) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 650, borderBottom: 'none' } }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right" sx={tabular}>{formatApiAmount(entry.total_debit)}</TableCell>
                    <TableCell align="right" sx={tabular}>{formatApiAmount(entry.total_credit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function EntryList({ entries }: { entries: Transaction[] }) {
  const brand = useBrand()
  return (
    <Box component="section" aria-labelledby="saved-entries-title" sx={{ ...cardSx(brand), p: { xs: 2.5, sm: 4 } }}>
      <Typography id="saved-entries-title" variant="h3" component="h2" sx={{ mb: 2 }}>
        Saved entries
      </Typography>
      {entries.length === 0 ? (
        <Typography color="text.secondary">No entries yet. Your first saved entry will appear here.</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Saved entries">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>No.</TableCell>
                <TableCell>Applied date</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
