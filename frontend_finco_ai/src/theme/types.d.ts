import type { CSSProperties } from 'react'
import type { BrandScale } from './palette.ts'

declare module '@mui/material/styles' {
  // The user's single-hue brand scale (50…950); use 'brand.600' etc. in sx.
  interface Palette {
    brand: BrandScale
  }

  interface PaletteOptions {
    brand?: BrandScale
  }

  // `money` typography variant: tabular figures for amounts and account codes.
  interface TypographyVariants {
    money: CSSProperties
  }

  interface TypographyVariantsOptions {
    money?: CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    money: true
  }
}
