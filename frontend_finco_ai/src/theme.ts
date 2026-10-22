import { createTheme } from '@mui/material/styles'

// Light and dark schemes; MUI picks one from the OS preference.
// The palette is set per scheme — a top-level `palette` would only apply to light.
export const theme = createTheme({
  colorSchemes: {
    light: { palette: { primary: { main: '#0f766e' } } },
    dark: { palette: { primary: { main: '#2dd4bf' } } },
  },
  shape: { borderRadius: 12 },
})
