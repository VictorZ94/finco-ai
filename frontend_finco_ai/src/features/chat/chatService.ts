import type { ChatMessage } from './types.ts'

// Mock AI reply. This is the single swap point for the real backend call
// (e.g. POST to the Django ai_chat API) once it exists.
export async function sendMessage(
  _history: ChatMessage[],
  text: string,
): Promise<string> {
  const delay = 800 + Math.random() * 400
  await new Promise((resolve) => setTimeout(resolve, delay))
  return `You said: "${text}"\n\nI'm a placeholder reply — the AI model isn't connected yet.`
}
