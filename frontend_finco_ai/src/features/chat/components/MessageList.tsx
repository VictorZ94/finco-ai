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
  isAnswering: boolean
  onPickExample: (text: string) => void
  onAnswerProposal: (accept: boolean) => void
}

export default function MessageList({
  messages,
  isSending,
  isAnswering,
  onPickExample,
  onAnswerProposal,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending, isAnswering])

  if (messages.length === 0) {
    return <EmptyState onPickExample={onPickExample} />
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 0, sm: 1 } }}>
      <Stack spacing={3} sx={{ py: 1 }}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isAnswering={isAnswering}
            onAnswerProposal={onAnswerProposal}
          />
        ))}
        {(isSending || isAnswering) && <TypingIndicator />}
        <div ref={endRef} />
      </Stack>
    </Box>
  )
}
