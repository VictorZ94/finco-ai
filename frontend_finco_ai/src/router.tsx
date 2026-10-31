import { createBrowserRouter, redirect } from 'react-router'
import AppLayout from './layouts/AppLayout.tsx'
import LoginPage from './features/auth/LoginPage.tsx'
import RequireAuth from './features/auth/RequireAuth.tsx'
import ChatPage from './features/chat/ChatPage.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import PucPage from './features/puc/PucPage.tsx'
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
          { index: true, loader: () => redirect('/dashboard') },
          { path: 'dashboard', Component: DashboardPage },
          { path: 'chat', Component: ChatPage },
          { path: 'ledger', Component: LedgerPage },
          { path: 'puc', Component: PucPage },
        ],
      },
    ],
  },
  { path: '*', loader: () => redirect('/dashboard') },
])
