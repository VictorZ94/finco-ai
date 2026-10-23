import { useState } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { formatDateTime, formatIsoDate } from '../dates.ts'
import { formatApiAmount } from '../money.ts'
import type { Transaction } from '../types.ts'

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
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>#{entry.numbering}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatIsoDate(entry.applied_date)}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {formatDateTime(entry.created_at)}
        </TableCell>
        <TableCell>{entry.supplier || '—'}</TableCell>
        <TableCell>{entry.description || '—'}</TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {formatApiAmount(entry.total_debit)}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, pl: { sm: 6 } }}>
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
                        {line.account_code} · {line.account_name}
                      </TableCell>
                      <TableCell align="right">
                        {Number(line.debit) > 0 ? formatApiAmount(line.debit) : ''}
                      </TableCell>
                      <TableCell align="right">
                        {Number(line.credit) > 0 ? formatApiAmount(line.credit) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 700, borderBottom: 'none' } }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">{formatApiAmount(entry.total_debit)}</TableCell>
                    <TableCell align="right">{formatApiAmount(entry.total_credit)}</TableCell>
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
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Saved entries
      </Typography>
      {entries.length === 0 ? (
        <Typography color="text.secondary">No entries yet. Save your first one above.</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Saved entries">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>#</TableCell>
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
    </Paper>
  )
}
