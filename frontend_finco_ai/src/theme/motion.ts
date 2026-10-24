import { keyframes } from '@mui/material/styles'

// Quiet motion: one short entrance per page; everything else only answers the user.
// prefers-reduced-motion is handled globally in the theme's CssBaseline overrides.

export const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`

/** Staggered page-load reveal: give each top-level section its index. */
export function revealSx(index: number) {
  return {
    animation: `${rise} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    animationDelay: `${index * 50}ms`,
  }
}
