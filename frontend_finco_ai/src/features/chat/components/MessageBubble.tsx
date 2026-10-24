import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import BrandMark from '../../../components/BrandMark.tsx'
import { radius } from '../../../theme/tokens.ts'
import type { ChatMessage } from '../types.ts'

interface MessageBubbleProps {
  message: ChatMessage
}

const timeFormat = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' })

/** User messages: brand-600 bubbles on the right. Assistant replies: white cards with the mark. */
export default function MessageBubble({ message }: MessageBubbleProps) {
  const time = timeFormat.format(message.createdAt)
  const isUser = message.role === 'user'

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {!isUser && (
        <Box sx={{ pt: 0.5 }}>
          <BrandMark size={28} title="FincoAI" />
        </Box>
      )}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          maxWidth: { xs: '85%', sm: '72%' },
          borderRadius: radius.bubble,
          ...(isUser
            ? { bgcolor: 'brand.600', color: '#FFFFFF', borderBottomRightRadius: '6px' }
            : {
                bgcolor: '#FFFFFF',
                color: 'brand.950',
                border: 1,
                borderColor: 'brand.100',
                borderTopLeftRadius: '6px',
              }),
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit' }}>
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.5, textAlign: isUser ? 'right' : 'left', color: isUser ? 'brand.100' : 'brand.500' }}
        >
          {time}
        </Typography>
      </Box>
    </Box>
  )
}
