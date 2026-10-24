import { useTheme } from '@mui/material/styles'
import type { BrandScale } from './palette.ts'

/** The active brand scale (50…950), for values sx strings can't express (SVG strokes, borders, shadows). */
export function useBrand(): BrandScale {
  return useTheme().palette.brand
}
