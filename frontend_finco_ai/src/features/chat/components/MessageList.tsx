import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import type { ChatMessage } from '../types.ts'
import EmptyState from './EmptyState.tsx'
import MessageBubble from './MessageBubble.tsx'
import TypingIndicator from './TypingIndicator.tsx'

interface MessageListProps {
  messages: ChatMessage[]
  isSending: boolean
  onPickExample: (text: string) => void
}

export default function MessageList({ messages, isSending, onPickExample }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  if (messages.length === 0) {
    return <EmptyState onPickExample={onPickExample} />
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 0, sm: 1 } }}>
      <Stack spacing={2} sx={{ py: 1 }}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending && <TypingIndicator />}
        <div ref={endRef} />
      </Stack>
    </Box>
  )
}
