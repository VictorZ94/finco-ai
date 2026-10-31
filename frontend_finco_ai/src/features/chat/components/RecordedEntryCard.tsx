import { Link as RouterLink } from 'react-router'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatIsoDate } from '../../../lib/dates.ts'
import { entryRows } from '../cards.ts'
import type { RecordedCard } from '../types.ts'

/** The entry the agent saved: number, date and its two lines. */
export default function RecordedEntryCard({ card }: { card: RecordedCard }) {
  const details = [card.supplier, card.description].filter(Boolean).join(' · ')
  return (
    <Box
      sx={{ mt: 1.5, p: 1.5, bgcolor: 'brand.50', border: 1, borderColor: 'brand.100', borderRadius: '16px' }}
      data-testid="recorded-entry"
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 1 }}>
        <Typography variant="subtitle2">
          Entry{' '}
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            #{card.numbering}
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatIsoDate(card.applied_date)}
        </Typography>
      </Stack>
      {details && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {details}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          columnGap: 1.5,
          rowGap: 0.75,
          alignItems: 'baseline',
        }}
      >
        {entryRows(card).map((row) => (
          <Box key={row.side} sx={{ display: 'contents' }}>
            <Typography variant="caption" color="text.secondary">
              {row.side}
            </Typography>
            <Typography variant="body2" noWrap title={`${row.code} · ${row.name}`}>
              <Typography component="span" variant="money" sx={{ color: 'text.secondary', mr: 1 }}>
                {row.code}
              </Typography>
              {row.name}
            </Typography>
            <Typography variant="money" sx={{ fontWeight: 600 }}>
              {row.amount}
            </Typography>
          </Box>
        ))}
      </Box>
      <Link component={RouterLink} to="/ledger" variant="body2" sx={{ display: 'inline-block', mt: 1 }}>
        View in ledger
      </Link>
    </Box>
  )
}
