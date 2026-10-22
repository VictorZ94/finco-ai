import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import type { ChatMessage } from '../types.ts'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const time = message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-end',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {!isUser && (
        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
          <SmartToyIcon fontSize="small" />
        </Avatar>
      )}
      <Paper
        elevation={0}
        sx={(theme) => ({
          px: 2,
          py: 1.25,
          maxWidth: { xs: '85%', sm: '75%' },
          borderRadius: '18px',
          ...(isUser
            ? {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderBottomRightRadius: '4px',
              }
            : {
                bgcolor: 'grey.100',
                borderBottomLeftRadius: '4px',
                ...theme.applyStyles('dark', { bgcolor: 'grey.800' }),
              }),
        })}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'right', mt: 0.5, opacity: 0.7 }}
        >
          {time}
        </Typography>
      </Paper>
    </Box>
  )
}
