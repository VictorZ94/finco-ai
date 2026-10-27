import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import '@fontsource-variable/geist'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { queryClient } from './lib/queryClient.ts'
import { router } from './router.tsx'
import ThemeColorProvider from './theme/ThemeColorProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Server state (API data) lives in the TanStack Query cache; AuthProvider clears it on sign-out. */}
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Builds the MUI theme (and CssBaseline) from the user's chosen brand color. */}
        <ThemeColorProvider>
          <RouterProvider router={router} />
        </ThemeColorProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
