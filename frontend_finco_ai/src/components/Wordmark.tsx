import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BrandMark from './BrandMark.tsx'

/** The mark plus "FincoAI" in Geist, tightly tracked. */
export default function Wordmark({ size = 'small' }: { size?: 'small' | 'large' }) {
  const large = size === 'large'
  return (
    <Stack direction="row" spacing={large ? 1.5 : 1.25} sx={{ alignItems: 'center' }}>
      <BrandMark size={large ? 36 : 28} />
      <Typography
        component="span"
        sx={{
          fontWeight: 600,
          fontSize: large ? '1.5rem' : '1.125rem',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'brand.950',
        }}
      >
        FincoAI
      </Typography>
    </Stack>
  )
}
