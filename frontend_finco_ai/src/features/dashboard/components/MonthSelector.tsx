import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { radius } from '../../../theme/tokens.ts'
import { currentMonth, formatMonthLong, shiftMonth } from '../months.ts'

interface MonthSelectorProps {
  month: string
  onChange: (month: string) => void
}

export default function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const isLatest = month >= currentMonth()
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        bgcolor: '#FFFFFF',
        border: 1,
        borderColor: 'brand.200',
        borderRadius: radius.pill,
        p: 0.5,
      }}
    >
      <IconButton size="small" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))} sx={{ borderRadius: '50%' }}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography
        aria-live="polite"
        sx={{ minWidth: 150, textAlign: 'center', fontWeight: 500, fontSize: '0.9375rem', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatMonthLong(month)}
      </Typography>
      <IconButton
        size="small"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isLatest}
        sx={{ borderRadius: '50%' }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}
