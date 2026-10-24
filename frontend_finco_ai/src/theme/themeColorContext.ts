import { createContext, useContext } from 'react'
import { DEFAULT_SEED } from './palette.ts'

export interface ThemeColorState {
  /** The active brand seed (#RRGGBB). */
  seed: string
  /** Apply a new seed now; persists to this browser and, when signed in, the user's profile. */
  setSeed: (seed: string) => void
  /** Set when saving the color to the profile failed. */
  saveError: string | null
}

export const ThemeColorContext = createContext<ThemeColorState>({
  seed: DEFAULT_SEED,
  setSeed: () => {},
  saveError: null,
})

export function useThemeColor() {
  return useContext(ThemeColorContext)
}
