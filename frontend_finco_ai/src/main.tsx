import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@fontsource-variable/geist'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { router } from './router.tsx'
import ThemeColorProvider from './theme/ThemeColorProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {/* Builds the MUI theme (and CssBaseline) from the user's chosen brand color. */}
      <ThemeColorProvider>
        <RouterProvider router={router} />
      </ThemeColorProvider>
    </AuthProvider>
  </StrictMode>,
)
