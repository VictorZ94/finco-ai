import { alpha, createTheme } from '@mui/material/styles'
import type { BrandScale } from './palette.ts'
import { danger, fontFamily, radius, white } from './tokens.ts'

/** Build the app theme from the user's brand scale. Light only, monochrome. */
export function createAppTheme(brand: BrandScale) {
  const heading = { fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.015em', color: brand[950] }
  const display = { fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.035em', color: brand[950] }
  const cardBorder = `1px solid ${brand[100]}`

  return createTheme({
    cssVariables: true,
    palette: {
      mode: 'light',
      brand,
      primary: { main: brand[600], dark: brand[700], light: brand[400], contrastText: white },
      secondary: { main: brand[200], contrastText: brand[900] },
      error: { main: danger.main, light: danger.surface, contrastText: white },
      // Success/info/warning stay in the brand hue to keep the UI monochrome.
      success: { main: brand[600], light: brand[200], contrastText: white },
      info: { main: brand[600], light: brand[100], contrastText: white },
      warning: { main: brand[700], light: brand[100], contrastText: white },
      background: { default: brand[50], paper: white },
      text: { primary: brand[950], secondary: brand[600], disabled: brand[400] },
      divider: brand[100],
      action: {
        hover: alpha(brand[600], 0.06),
        selected: alpha(brand[600], 0.1),
        disabled: brand[300],
        disabledBackground: brand[100],
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily,
      // 13 / 14 / 16 / 20 / 24 / 32 / 44
      h1: { ...display, fontSize: '2.75rem' },
      h2: { ...display, fontSize: '2rem' },
      h3: { ...heading, fontSize: '1.5rem' },
      h4: { ...heading, fontSize: '1.25rem' },
      h5: { ...heading, fontSize: '1.125rem' },
      h6: { ...heading, fontSize: '1rem', letterSpacing: '-0.01em' },
      subtitle1: { fontSize: '1rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
      body1: { fontSize: '1rem', lineHeight: 1.55 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.8125rem', lineHeight: 1.4 },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: '-0.005em', fontSize: '0.9375rem' },
      money: {
        fontFamily,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 500,
        letterSpacing: '-0.01em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: 'light' },
          body: { backgroundColor: brand[50] },
          '::selection': { backgroundColor: brand[200], color: brand[950] },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationDelay: '0ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            fontFamily: 'inherit', // plain <button>s otherwise fall back to the system font
            '&.Mui-focusVisible': { outline: `2px solid ${brand[400]}`, outlineOffset: 2 },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius.control, paddingInline: 18 },
          sizeLarge: { minHeight: 48 },
          outlined: {
            borderColor: brand[200],
            color: brand[950],
            backgroundColor: white,
            '&:hover': { borderColor: brand[300], backgroundColor: brand[50] },
          },
          text: { color: brand[700] },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: radius.control } },
      },
      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: { root: { color: brand[700], fontWeight: 500 } },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: brand[100] },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: { backgroundColor: white, color: brand[950], borderBottom: cardBorder },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.control,
            backgroundColor: white,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: brand[200] },
            '&:hover:not(.Mui-disabled, .Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: brand[300] },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[600], borderWidth: 1.5 },
            '&.Mui-disabled': { backgroundColor: brand[50] },
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: brand[100] },
          },
          input: { '&::placeholder': { color: brand[400], opacity: 1 } },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { color: brand[600], '&.Mui-focused': { color: brand[700] } } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { color: brand[500], marginLeft: 2 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: brand[100] },
          head: { color: brand[600], fontWeight: 500, fontSize: '0.8125rem' },
        },
      },
      MuiTabs: {
        styleOverrides: { indicator: { backgroundColor: brand[950], height: 2 } },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9375rem',
            color: brand[600],
            minWidth: 0,
            paddingInline: 4,
            marginRight: 20,
            '&.Mui-selected': { color: brand[950] },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, borderRadius: radius.pill },
          filled: { backgroundColor: brand[200], color: brand[900] },
          outlined: { borderColor: brand[200], color: brand[900] },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radius.control,
            alignItems: 'center',
            color: brand[950],
            backgroundColor: brand[50],
            border: cardBorder,
            variants: [
              {
                props: { variant: 'standard', severity: 'error' },
                style: { backgroundColor: danger.surface, borderColor: 'transparent', color: brand[950] },
              },
            ],
          },
          icon: { color: brand[600] },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: cardBorder, borderRadius: 16, marginTop: 8, boxShadow: `0 8px 24px ${alpha(brand[950], 0.08)}` },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: { border: cardBorder, borderRadius: 16, marginTop: 4, boxShadow: `0 8px 24px ${alpha(brand[950], 0.08)}` },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: radius.card, border: cardBorder } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: brand[950], fontSize: '0.8125rem', borderRadius: 8 } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: brand[100] } },
      },
    },
  })
}

/** A white card on the page background, as in the reference. */
export function cardSx(brand: BrandScale) {
  return {
    bgcolor: white,
    border: `1px solid ${brand[100]}`,
    borderRadius: radius.card,
    boxShadow: `0 1px 2px ${alpha(brand[950], 0.04)}`,
  }
}
