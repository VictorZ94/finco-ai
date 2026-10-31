import { createBrowserRouter, redirect } from 'react-router'
import AppLayout from './layouts/AppLayout.tsx'
import LoginPage from './features/auth/LoginPage.tsx'
import RequireAuth from './features/auth/RequireAuth.tsx'
import ChatPage from './features/chat/ChatPage.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import PucPage from './features/puc/PucPage.tsx'
import BalanceSheetPage from './features/reports/BalanceSheetPage.tsx'
import GeneralLedgerPage from './features/reports/GeneralLedgerPage.tsx'
import IncomeStatementPage from './features/reports/IncomeStatementPage.tsx'
import JournalPage from './features/reports/JournalPage.tsx'
import ReportsLayout from './features/reports/ReportsLayout.tsx'
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
          {
            path: 'reports',
            Component: ReportsLayout,
            children: [
              // Keep the period (?from=&to=) when landing on /reports.
              { index: true, loader: ({ request }) => redirect(`income-statement${new URL(request.url).search}`) },
              { path: 'income-statement', Component: IncomeStatementPage },
              { path: 'balance-sheet', Component: BalanceSheetPage },
              { path: 'journal', Component: JournalPage },
              { path: 'general-ledger', Component: GeneralLedgerPage },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', loader: () => redirect('/dashboard') },
])
