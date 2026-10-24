// Fixed design tokens. Brand colors are NOT here: they come from the user's
// chosen scale (src/theme/palette.ts) via theme.palette.brand.

export const fontFamily = '"Geist Variable", "Segoe UI", system-ui, sans-serif'

export const radius = {
  control: '12px', // inputs, buttons
  card: '24px', // white cards, tinted panels
  bubble: '20px',
  pill: '999px',
} as const

// The only non-brand color: errors and an unbalanced difference.
export const danger = { main: '#B4433E', surface: '#FBEDEC' } as const

export const white = '#FFFFFF'
