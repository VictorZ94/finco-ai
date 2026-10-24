import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { revealSx } from '../../../theme/motion.ts'
import { concentricRings } from '../../../theme/patterns.ts'
import { radius } from '../../../theme/tokens.ts'
import { useBrand } from '../../../theme/useBrand.ts'

const EXAMPLES = [
  'I paid 50,000 for lunch',
  'I received my salary of 3,000,000',
  'I bought a laptop with my credit card',
]

interface EmptyStateProps {
  onPickExample: (text: string) => void
}

/** A tinted card with faint rings, like the reference's "Track your expenses". */
export default function EmptyState({ onPickExample }: EmptyStateProps) {
  const brand = useBrand()
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: '100%',
          bgcolor: 'brand.200',
          ...concentricRings(brand[400], 0.6),
          border: 1,
          borderColor: 'brand.300',
          borderRadius: radius.card,
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 6 },
          ...revealSx(0),
        }}
      >
        <Typography variant="h1" component="h2" sx={{ maxWidth: '12ch', mb: 1.5, fontSize: { xs: '2.25rem', sm: '2.75rem' } }}>
          What moved today?
        </Typography>
        <Typography sx={{ color: 'brand.900', maxWidth: '46ch', mb: 3.5 }}>
          Describe a movement in plain words and FincoAI turns it into a ledger entry.
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {EXAMPLES.map((example) => (
            <ButtonBase
              key={example}
              onClick={() => onPickExample(example)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: radius.pill,
                bgcolor: '#FFFFFF',
                color: 'brand.950',
                fontSize: '0.9375rem',
                fontWeight: 500,
                transition: 'background-color 150ms',
                '&:hover': { bgcolor: 'brand.50' },
              }}
            >
              {example}
            </ButtonBase>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
