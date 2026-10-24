import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { apiToCents, formatCents } from '../../../lib/money.ts'
import { cardSx } from '../../../theme/index.ts'
import { danger } from '../../../theme/tokens.ts'
import { useBrand } from '../../../theme/useBrand.ts'
import { formatMonthEnd, formatMonthName } from '../months.ts'
import type { DashboardSummary } from '../types.ts'

/** "vs septiembre: +12%"; null when there is nothing to compare with. */
function comparison(current: string, previous: string, previousMonth: string): string | null {
  const now = apiToCents(current)
  const before = apiToCents(previous)
  if (before === 0) return null
  const change = Math.round(((now - before) / Math.abs(before)) * 100)
  const sign = change > 0 ? '+' : ''
  return `vs ${formatMonthName(previousMonth)}: ${sign}${change}%`
}

interface FigureProps {
  label: string
  cents: number
  caption?: string | null
  negativeIsBad?: boolean
}

function Figure({ label, cents, caption, negativeIsBad }: FigureProps) {
  const brand = useBrand()
  const isNegative = cents < 0
  return (
    <Box sx={{ ...cardSx(brand), p: 3, minWidth: 0 }}>
      <Typography color="text.secondary" sx={{ fontWeight: 500, mb: 1.5 }}>
        {label}
      </Typography>
      <Typography
        variant="money"
        component="p"
        sx={{
          fontSize: { xs: '1.75rem', md: '2rem' },
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: negativeIsBad && isNegative ? danger.main : 'text.primary',
          overflowWrap: 'anywhere',
        }}
      >
        {formatCents(cents)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, minHeight: '1.4em' }}>
        {caption ?? ''}
      </Typography>
    </Box>
  )
}

export default function KeyFigures({ summary }: { summary: DashboardSummary }) {
  const { previous } = summary
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
      }}
    >
      <Figure
        label="Net worth"
        cents={apiToCents(summary.net_worth)}
        caption={`As of ${formatMonthEnd(summary.month)}`}
        negativeIsBad
      />
      <Figure
        label="Income"
        cents={apiToCents(summary.income)}
        caption={comparison(summary.income, previous.income, previous.month)}
      />
      <Figure
        label="Expenses"
        cents={apiToCents(summary.expenses)}
        caption={comparison(summary.expenses, previous.expenses, previous.month)}
      />
      <Figure label="Net" cents={apiToCents(summary.net)} caption="Income minus expenses" negativeIsBad />
    </Box>
  )
}
