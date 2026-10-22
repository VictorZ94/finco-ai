import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SmartToyIcon from '@mui/icons-material/SmartToy'

const EXAMPLES = [
  'I paid 50,000 for lunch',
  'I received my salary of 3,000,000',
  'I bought a laptop with my credit card',
]

interface EmptyStateProps {
  onPickExample: (text: string) => void
}

export default function EmptyState({ onPickExample }: EmptyStateProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2,
        px: 2,
      }}
    >
      <SmartToyIcon color="primary" sx={{ fontSize: 48 }} />
      <Typography variant="h5" component="h2">
        How can I help with your finances?
      </Typography>
      <Typography color="text.secondary">
        Describe a movement in plain words and I'll record it for you.
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {EXAMPLES.map((example) => (
          <Chip key={example} label={example} variant="outlined" onClick={() => onPickExample(example)} />
        ))}
      </Stack>
    </Box>
  )
}
