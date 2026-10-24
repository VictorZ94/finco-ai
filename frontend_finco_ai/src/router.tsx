import { createBrowserRouter, redirect } from 'react-router'
import AppLayout from './layouts/AppLayout.tsx'
import LoginPage from './features/auth/LoginPage.tsx'
import RequireAuth from './features/auth/RequireAuth.tsx'
import ChatPage from './features/chat/ChatPage.tsx'
import LedgerPage from './features/ledger/LedgerPage.tsx'

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    // Everything except /login requires a signed-in Firebase user.
    Component: RequireAuth,
    children: [
      {
        path: '/',
        Component: AppLayout,
        children: [
          { index: true, loader: () => redirect('/chat') },
          { path: 'chat', Component: ChatPage },
          { path: 'ledger', Component: LedgerPage },
        ],
      },
    ],
  },
  { path: '*', loader: () => redirect('/chat') },
])
