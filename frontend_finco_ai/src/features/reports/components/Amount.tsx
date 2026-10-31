import Typography from '@mui/material/Typography'
import { apiToCents, formatCents } from '../../../lib/money.ts'
import { danger } from '../../../theme/tokens.ts'

interface AmountProps {
  value: string
  /** Show nothing instead of $ 0 (debit/credit columns). */
  blankZero?: boolean
}

/** An API amount in the money style; negatives in the danger color. */
export default function Amount({ value, blankZero = false }: AmountProps) {
  const cents = apiToCents(value)
  if (blankZero && cents === 0) return null
  return (
    <Typography
      component="span"
      variant="money"
      sx={{ whiteSpace: 'nowrap', fontWeight: 'inherit', fontSize: 'inherit', color: cents < 0 ? danger.main : 'inherit' }}
    >
      {formatCents(cents)}
    </Typography>
  )
}
