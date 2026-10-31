import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { todayIso } from '../../../lib/dates.ts'
import { PRESETS, changePeriod, matchPreset, presetPeriod } from '../periods.ts'
import type { Period } from '../types.ts'

interface PeriodBarProps {
  period: Period
  onChange: (period: Period) => void
  /** The balance sheet only needs a cut-off date: the "To" end. */
  asOf?: boolean
}

export default function PeriodBar({ period, onChange, asOf = false }: PeriodBarProps) {
  const today = todayIso()
  const active = matchPreset(period, today)
  const dateField = (end: keyof Period, label: string) => (
    <TextField
      type="date"
      size="small"
      label={label}
      value={period[end]}
      onChange={(event) => onChange(changePeriod(period, end, event.target.value))}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: end === 'to' ? undefined : period.to } }}
      sx={{ width: { xs: '100%', sm: 170 }, '& input': { fontVariantNumeric: 'tabular-nums' } }}
    />
  )

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', displayPrint: 'none' }}
    >
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }} role="group" aria-label="Period presets">
        {PRESETS.map((preset) => (
          <Chip
            key={preset.key}
            label={preset.label}
            clickable
            color={active === preset.key ? 'primary' : 'default'}
            variant={active === preset.key ? 'filled' : 'outlined'}
            aria-pressed={active === preset.key}
            onClick={() => onChange(presetPeriod(preset.key, today))}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1.5}>
        {asOf ? dateField('to', 'As of') : (
          <>
            {dateField('from', 'From')}
            {dateField('to', 'To')}
          </>
        )}
      </Stack>
    </Stack>
  )
}
