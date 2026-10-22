import Alert from '@mui/material/Alert'
import Container from '@mui/material/Container'
import ChatInput from './components/ChatInput.tsx'
import MessageList from './components/MessageList.tsx'
import { useChat } from './useChat.ts'

export default function ChatPage() {
  const { messages, isSending, error, send, clearError } = useChat()

  return (
    <Container
      maxWidth="md"
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', py: 2, gap: 2 }}
    >
      <MessageList messages={messages} isSending={isSending} onPickExample={send} />
      {error && (
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      )}
      <ChatInput disabled={isSending} onSend={send} />
    </Container>
  )
}
