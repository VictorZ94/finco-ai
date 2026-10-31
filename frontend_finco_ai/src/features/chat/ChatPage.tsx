import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import {
  useAnswerProposal,
  useConversations,
  useCreateConversation,
  useMessages,
  useSendMessage,
} from '../../hooks/chat/useChat.ts'
import ChatInput from './components/ChatInput.tsx'
import MessageList from './components/MessageList.tsx'

export default function ChatPage() {
  const conversations = useConversations()
  // null: follow the latest conversation; set when the user starts a new one.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const conversationId = selectedId ?? conversations.data?.[0]?.id
  const messages = useMessages(conversationId)
  const createConversation = useCreateConversation()
  const sendMessage = useSendMessage()
  const answerProposal = useAnswerProposal()

  const isBusy = sendMessage.isPending || answerProposal.isPending || createConversation.isPending
  const error = sendMessage.error ?? answerProposal.error ?? createConversation.error
  const hasMessages = (messages.data?.length ?? 0) > 0

  async function send(text: string) {
    const content = text.trim()
    if (!content || isBusy) return
    answerProposal.reset()
    let id = conversationId
    if (!id) {
      const created = await createConversation.mutateAsync()
      setSelectedId(created.id)
      id = created.id
    }
    sendMessage.mutate({ conversationId: id, content, clientId: crypto.randomUUID() })
  }

  function startNew() {
    sendMessage.reset()
    answerProposal.reset()
    createConversation.mutate(undefined, { onSuccess: (created) => setSelectedId(created.id) })
  }

  function answer(accept: boolean) {
    if (!conversationId || isBusy) return
    sendMessage.reset()
    answerProposal.mutate({ conversationId, accept })
  }

  const isLoading = conversations.isPending || (Boolean(conversationId) && messages.isPending)

  return (
    <Container
      maxWidth="md"
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', py: { xs: 2, sm: 3 }, gap: 2 }}
    >
      {hasMessages && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {conversations.data?.find((conversation) => conversation.id === conversationId)?.title}
          </Typography>
          <Button startIcon={<AddIcon />} size="small" onClick={startNew} disabled={isBusy} sx={{ flexShrink: 0 }}>
            New conversation
          </Button>
        </Stack>
      )}
      {conversations.isError || messages.isError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void (conversations.isError ? conversations.refetch() : messages.refetch())}
            >
              Retry
            </Button>
          }
        >
          {(conversations.error ?? messages.error)?.messages.join(' ')}
        </Alert>
      ) : isLoading ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <CircularProgress aria-label="Loading conversation" />
        </Box>
      ) : (
        <MessageList
          messages={messages.data ?? []}
          isSending={sendMessage.isPending}
          isAnswering={answerProposal.isPending}
          onPickExample={(text) => void send(text)}
          onAnswerProposal={answer}
        />
      )}
      {error && (
        <Alert
          severity="error"
          onClose={() => {
            sendMessage.reset()
            answerProposal.reset()
            createConversation.reset()
          }}
        >
          {error.messages.join(' ')}
        </Alert>
      )}
      <ChatInput disabled={isBusy} onSend={(text) => void send(text)} />
    </Container>
  )
}
