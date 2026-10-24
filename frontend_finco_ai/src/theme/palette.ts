import { clampChroma, formatHex, oklch, wcagContrast } from 'culori'

/**
 * Single-hue brand scales with guaranteed contrast.
 *
 * Every scale reuses the LIGHTNESS of the reference Slate scale (OKLCH), so any hue
 * the user picks lands on the same contrast ratios; ensureContrast() then fixes
 * the rare seeds (very saturated yellows/greens) that still fall short.
 */

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type Shade = (typeof SHADES)[number]
export type BrandScale = Record<Shade, string>

/** The reference scale, used verbatim as the default ("Slate"). */
export const SLATE: BrandScale = {
  50: '#F5F6FA',
  100: '#EAEDF4',
  200: '#CFD8E8',
  300: '#A5B7D4',
  400: '#7590BB',
  500: '#5473A3',
  600: '#3F5885',
  700: '#35496F',
  800: '#2F3F5D',
  900: '#2B374F',
  950: '#1D2434',
}

const WHITE = '#FFFFFF'

/** The contrast rules every scale must meet (WCAG ratios). */
export const CONTRAST_RULES = [
  { id: 'text', label: 'Text', fg: 950, bg: 50, min: 7 },
  { id: 'secondary', label: 'Secondary text', fg: 600, bg: 'white', min: 4.5 },
  { id: 'button', label: 'Buttons', fg: 'white', bg: 600, min: 4.5 },
  { id: 'pill', label: 'Tags', fg: 900, bg: 200, min: 4.5 },
  { id: 'panel', label: 'Panels', fg: 950, bg: 400, min: 4.5 },
] as const satisfies readonly { id: string; label: string; fg: Shade | 'white'; bg: Shade | 'white'; min: number }[]

const slateOklch = SHADES.map((shade) => oklch(SLATE[shade])!)
const LIGHTNESS = Object.fromEntries(SHADES.map((s, i) => [s, slateOklch[i].l])) as Record<Shade, number>
const slateMaxChroma = Math.max(...slateOklch.map((c) => c.c ?? 0))
// How saturated each shade is relative to the scale's most saturated one (bell-shaped around 500).
const CHROMA_PROFILE = Object.fromEntries(
  SHADES.map((s, i) => [s, (slateOklch[i].c ?? 0) / slateMaxChroma]),
) as Record<Shade, number>

// Keep custom colors professional: never more saturated than this at the peak shade.
const MAX_PEAK_CHROMA = 0.12
// Below this the seed is treated as a neutral grey.
const NEUTRAL_CHROMA = 0.012

function toHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch'))!.toUpperCase()
}

function colorOf(scale: BrandScale, key: Shade | 'white') {
  return key === 'white' ? WHITE : scale[key]
}

export function contrastRatio(a: string, b: string): number {
  return wcagContrast(a, b)
}

/** The ratio each rule achieves for this scale. */
export function contrastReport(scale: BrandScale) {
  return CONTRAST_RULES.map((rule) => {
    const ratio = contrastRatio(colorOf(scale, rule.fg), colorOf(scale, rule.bg))
    return { ...rule, ratio, passes: ratio >= rule.min }
  })
}

/** Build a scale from any seed color, keeping its hue (and its chroma, up to a professional cap). */
export function buildScale(seedHex: string): BrandScale {
  const seed = oklch(seedHex)
  if (!seed) throw new Error(`Invalid color: ${seedHex}`)
  const isNeutral = (seed.c ?? 0) < NEUTRAL_CHROMA
  const hue = isNeutral ? 260 : (seed.h ?? 0)
  const peak = isNeutral ? 0.012 : Math.min(seed.c ?? 0, MAX_PEAK_CHROMA)

  const lightness = { ...LIGHTNESS }
  const make = () =>
    Object.fromEntries(SHADES.map((s) => [s, toHex(lightness[s], peak * CHROMA_PROFILE[s], hue)])) as BrandScale

  // Contrast guard: darken the dark end (and lighten the light end) until every rule passes.
  let scale = make()
  for (let step = 0; step < 40 && !contrastReport(scale).every((r) => r.passes); step++) {
    const failing = new Set(contrastReport(scale).filter((r) => !r.passes).map((r) => r.id))
    if (failing.has('text')) {
      lightness[950] -= 0.01
      lightness[50] = Math.min(0.99, lightness[50] + 0.003)
    }
    if (failing.has('secondary') || failing.has('button')) {
      lightness[600] -= 0.01
      lightness[700] = Math.min(lightness[700], lightness[600] - 0.04)
    }
    if (failing.has('panel')) {
      lightness[950] -= 0.01
      lightness[400] = Math.min(lightness[300] - 0.04, lightness[400] + 0.005)
    }
    if (failing.has('pill')) {
      lightness[900] -= 0.01
      lightness[200] = Math.min(0.95, lightness[200] + 0.003)
    }
    // Keep the scale ordered from light to dark.
    lightness[800] = Math.min(lightness[800], lightness[700] - 0.02)
    lightness[900] = Math.min(lightness[900], lightness[800] - 0.02)
    lightness[950] = Math.min(lightness[950], lightness[900] - 0.04)
    scale = make()
  }
  return scale
}

export interface ColorPreset {
  id: string
  name: string
  seed: string
}

/** Swatches offered in Appearance. Seeds are mid-tones; the scale is generated from them. */
export const PRESETS: readonly ColorPreset[] = [
  { id: 'slate', name: 'Slate', seed: SLATE[500] },
  { id: 'ocean', name: 'Ocean', seed: '#2F6EA8' },
  { id: 'teal', name: 'Teal', seed: '#2B7A78' },
  { id: 'forest', name: 'Forest', seed: '#3D7A4F' },
  { id: 'clay', name: 'Clay', seed: '#A0583E' },
  { id: 'plum', name: 'Plum', seed: '#7A4E86' },
  { id: 'graphite', name: 'Graphite', seed: '#6B7078' },
  { id: 'sand', name: 'Sand', seed: '#9A7B4F' },
]

export const DEFAULT_SEED = SLATE[500]

/** The scale for a seed; the default seed returns the reference scale exactly. */
export function scaleFromSeed(seed: string | null | undefined): BrandScale {
  if (!seed || seed.toUpperCase() === DEFAULT_SEED) return SLATE
  try {
    return buildScale(seed)
  } catch {
    return SLATE
  }
}

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/
