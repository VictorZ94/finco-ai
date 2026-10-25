import { useEffect, useRef, useState, type ReactNode } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { useAuth } from '../features/auth/useAuth.ts'
import { useProfile, useSaveAccentColor } from '../features/auth/useProfile.ts'
import { createAppTheme } from './index.ts'
import { DEFAULT_SEED, HEX_COLOR, scaleFromSeed } from './palette.ts'
import { ThemeColorContext } from './themeColorContext.ts'

const STORAGE_KEY = 'finco.accentColor'
// The custom picker fires while dragging; save to the profile once the user settles.
const SAVE_DELAY_MS = 600

function readStoredSeed(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value && HEX_COLOR.test(value) ? value : null
  } catch {
    return null
  }
}

function storeSeed(seed: string) {
  try {
    localStorage.setItem(STORAGE_KEY, seed)
  } catch {
    // Private mode or blocked storage: the profile still keeps the choice.
  }
}

/**
 * Provides the MUI theme built from the user's brand color.
 * Priority: choice made in this session > saved profile color > this browser's cache > default.
 * The cache avoids a flash of the default color on reload.
 */
export default function ThemeColorProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  // Loading the profile here also registers a newly signed-in user with the backend.
  const { data: profile } = useProfile()
  const saveAccent = useSaveAccentColor()
  const [choice, setChoice] = useState<string | null>(null)
  const [stored] = useState(readStoredSeed)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const profileSeed = profile?.accent_color && HEX_COLOR.test(profile.accent_color) ? profile.accent_color : null
  const seed = (choice ?? profileSeed ?? stored ?? DEFAULT_SEED).toUpperCase()

  // Keep this browser's cache in step with the profile so the next load starts in the right color.
  useEffect(() => {
    if (profileSeed) storeSeed(profileSeed)
  }, [profileSeed])

  // The React Compiler memoizes the theme and the context value; no useMemo needed.
  const theme = createAppTheme(scaleFromSeed(seed))

  function setSeed(next: string) {
    const normalized = next.toUpperCase()
    setChoice(normalized)
    storeSeed(normalized)
    saveAccent.reset()
    if (status === 'signedIn') {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveAccent.mutate(normalized === DEFAULT_SEED ? '' : normalized)
      }, SAVE_DELAY_MS)
    }
  }

  const value = {
    seed,
    setSeed,
    saveError: saveAccent.isError ? 'Your color is applied here but could not be saved to your profile.' : null,
  }

  return (
    <ThemeColorContext value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeColorContext>
  )
}
