import { useState } from 'react'
import { sendMessage } from './chatService.ts'
import type { ChatMessage, Role } from './types.ts'

function createMessage(role: Role, content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date() }
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(text: string) {
    const content = text.trim()
    if (!content || isSending) return

    const history = messages
    setMessages((prev) => [...prev, createMessage('user', content)])
    setIsSending(true)
    setError(null)

    try {
      const reply = await sendMessage(history, content)
      setMessages((prev) => [...prev, createMessage('assistant', reply)])
    } catch {
      setError('The assistant could not respond. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return { messages, isSending, error, send, clearError: () => setError(null) }
}
