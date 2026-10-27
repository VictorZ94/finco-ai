import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendMessage } from './chatService.ts'
import type { ChatMessage, Role } from './types.ts'

function createMessage(role: Role, content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date() }
}

export function useChat() {
  // The conversation is local (not persisted yet); the request state comes from the mutation.
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const reply = useMutation({
    mutationFn: ({ history, content }: { history: ChatMessage[]; content: string }) => sendMessage(history, content),
    onSuccess: (text) => setMessages((prev) => [...prev, createMessage('assistant', text)]),
  })

  function send(text: string) {
    const content = text.trim()
    if (!content || reply.isPending) return
    setMessages((prev) => [...prev, createMessage('user', content)])
    reply.mutate({ history: messages, content })
  }

  return {
    messages,
    isSending: reply.isPending,
    error: reply.isError ? 'The assistant could not respond. Please try again.' : null,
    send,
    clearError: reply.reset,
  }
}
