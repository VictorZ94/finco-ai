# Step 01 — Chat layout at `/chat` (MUI + React Router)

Status: **done** (2026-10-22)

## Context
This is the first frontend step for FincoAI. Users should be able to type a message in a chat screen and see an AI reply. The backend has no API yet (Django views and URLs are empty), so the AI reply is **mocked behind one service function**. The real Django/LLM call can replace it in a later step without touching the UI. Scope stops at the chat UI: no backend work and no persistence (messages live in React state and are lost on reload).

## Dependencies (in `frontend_finco_ai/`)
```
npm install @mui/material @emotion/react @emotion/styled @fontsource/roboto @mui/icons-material react-router
```
Installed versions: MUI 9.5, React Router 8.5.
- React Router is used in data mode: `createBrowserRouter` + `RouterProvider`, imported from `"react-router"`.
- MUI v9: `TextField` no longer has `InputProps`/`inputProps`; use `slotProps.input` / `slotProps.htmlInput`.

## What was built
- **Removed the Vite template:** `App.tsx`, `App.css`, `index.css`, `src/assets/*` and `public/icons.svg`. The page title is now "FincoAI".
- **`src/main.tsx`**: loads Roboto 300/400/500/700 and renders `ThemeProvider` → `CssBaseline` → `RouterProvider`.
- **`src/theme.ts`**: `createTheme` with light and dark `colorSchemes`, chosen from the OS preference. The primary color is set **per scheme** (a top-level `palette` would only apply to light). `shape.borderRadius` is 12.
- **`src/router.tsx`**: `/` uses `AppLayout`; its index route redirects to `/chat`, and `/chat` renders `ChatPage`. Any unknown path (`*`) also redirects to `/chat`.
- **`src/layouts/AppLayout.tsx`**: a full-height (`100dvh`) column with an `AppBar` showing "FincoAI" and an `<Outlet/>` below it. The app shell for future pages.
- **`src/features/chat/`**:
  - `types.ts`: `Role` and `ChatMessage`.
  - `chatService.ts`: `sendMessage(history, text)` is a **mock** that waits 800–1200 ms and echoes the text. It is the single swap point for the backend API.
  - `useChat.ts`: owns `messages`, `isSending` and `error`. `send()` adds the user message right away, then the assistant reply.
  - `ChatPage.tsx` plus `components/`: `MessageList` (auto-scrolls to the bottom; shows `EmptyState` with example prompt chips when there are no messages), `MessageBubble` (user on the right in the primary color, assistant on the left with an avatar), `TypingIndicator` (animated dots) and `ChatInput` (Enter sends, Shift+Enter adds a newline, disabled while sending, refocuses after the reply).

Gotcha: a numeric `borderRadius` in `sx` is multiplied by `theme.shape.borderRadius`, so the bubble radii use px strings.

## Verification
- `npm run build` and `npm run lint` pass. The only output is Vite's >500 kB chunk-size warning, caused by MUI.
- Checked in the browser with playwright-cli: `/` and unknown paths redirect to `/chat`; example chips send a message; the typing indicator appears and then the reply; Shift+Enter keeps a newline; a long conversation auto-scrolls; there is no horizontal overflow at 390px wide; dark mode uses the teal primary.

## Next
Possible next steps, one at a time: connect `chatService.ts` to a Django `ai_chat` endpoint (this needs CORS or a Vite proxy and a `Message` model), or persist conversations.
