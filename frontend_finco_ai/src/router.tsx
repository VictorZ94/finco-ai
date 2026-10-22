import { createBrowserRouter, redirect } from 'react-router'
import AppLayout from './layouts/AppLayout.tsx'
import ChatPage from './features/chat/ChatPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, loader: () => redirect('/chat') },
      { path: 'chat', Component: ChatPage },
    ],
  },
  { path: '*', loader: () => redirect('/chat') },
])
