import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { keyframes } from '@mui/material/styles'

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
`

export default function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }} aria-label="Assistant is typing">
      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
        <SmartToyIcon fontSize="small" />
      </Avatar>
      <Paper
        elevation={0}
        sx={(theme) => ({
          px: 2,
          py: 1.5,
          display: 'flex',
          gap: 0.75,
          borderRadius: '18px',
          borderBottomLeftRadius: '4px',
          bgcolor: 'grey.100',
          ...theme.applyStyles('dark', { bgcolor: 'grey.800' }),
        })}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `${bounce} 1.2s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </Paper>
    </Box>
  )
}
