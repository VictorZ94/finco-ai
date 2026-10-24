import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import SendIcon from '@mui/icons-material/Send'
import { radius } from '../../../theme/tokens.ts'

interface ChatInputProps {
  disabled: boolean
  onSend: (text: string) => void
}

export default function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const canSend = !disabled && text.trim().length > 0

  // Refocus once the assistant has replied.
  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  function submit() {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Enter sends; Shift+Enter inserts a newline. Ignore while an IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        p: 1,
        pl: 2,
        bgcolor: '#FFFFFF',
        borderColor: 'brand.200',
        borderRadius: radius.card,
        transition: 'border-color 150ms',
        '&:focus-within': { borderColor: 'brand.600' },
      }}
    >
      <TextField
        inputRef={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        multiline
        maxRows={6}
        fullWidth
        variant="standard"
        autoFocus
        slotProps={{
          input: { disableUnderline: true },
          htmlInput: { 'aria-label': 'Message' },
        }}
        sx={{ py: 0.75 }}
      />
      <IconButton
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        sx={{
          borderRadius: '50%',
          bgcolor: 'brand.600',
          color: '#FFFFFF',
          '&:hover': { bgcolor: 'brand.700' },
          '&.Mui-disabled': { bgcolor: 'brand.100', color: 'brand.400' },
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Paper>
  )
}
