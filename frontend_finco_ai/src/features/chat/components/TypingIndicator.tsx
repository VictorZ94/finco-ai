import Box from '@mui/material/Box'
import { keyframes } from '@mui/material/styles'
import BrandMark from '../../../components/BrandMark.tsx'
import { radius } from '../../../theme/tokens.ts'

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
`

export default function TypingIndicator() {
  return (
    <Box role="status" aria-label="Assistant is typing" sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ pt: 0.5 }}>
        <BrandMark size={28} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 0.75,
          px: 2,
          py: 1.75,
          bgcolor: '#FFFFFF',
          border: 1,
          borderColor: 'brand.100',
          borderRadius: radius.bubble,
          borderTopLeftRadius: '6px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'brand.400',
              animation: `${pulse} 1.2s infinite ease-in-out`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
