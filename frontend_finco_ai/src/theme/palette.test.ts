import { formatHex } from 'culori'
import { describe, expect, it } from 'vitest'
import { HEX_COLOR, PRESETS, SHADES, SLATE, buildScale, contrastRatio, contrastReport, scaleFromSeed } from './palette.ts'

function expectReadable(seed: string) {
  const scale = scaleFromSeed(seed)
  for (const shade of SHADES) expect(scale[shade], `${seed} shade ${shade}`).toMatch(HEX_COLOR)
  for (const rule of contrastReport(scale)) {
    expect(rule.ratio, `${seed}: ${rule.label} ${rule.ratio.toFixed(2)} < ${rule.min}`).toBeGreaterThanOrEqual(rule.min)
  }
}

describe('brand palette', () => {
  it('uses the reference scale verbatim for the default', () => {
    expect(scaleFromSeed(null)).toEqual(SLATE)
    expect(scaleFromSeed(SLATE[500])).toEqual(SLATE)
  })

  it('the reference scale itself meets every contrast rule', () => {
    expect(contrastReport(SLATE).every((rule) => rule.passes)).toBe(true)
  })

  it.each(PRESETS.map((preset) => [preset.name, preset.seed]))('preset %s is readable', (_, seed) => {
    expectReadable(seed)
  })

  it('any hue and saturation stays readable', () => {
    for (let hue = 0; hue < 360; hue += 10) {
      for (const [saturation, lightness] of [[100, 50], [60, 40], [25, 70]]) {
        const seed = formatHex(`hsl(${hue} ${saturation}% ${lightness}%)`)!
        expectReadable(seed)
      }
    }
  })

  it.each(['#FFFF00', '#00FF00', '#000000', '#FFFFFF', '#FF00FF', '#00FFFF'])('extreme seed %s stays readable', (seed) => {
    expectReadable(seed)
  })

  it.each([...PRESETS.map((p) => p.seed), '#FFFF00', '#00FF00'])('keeps %s ordered from light to dark', (seed) => {
    const scale = buildScale(seed)
    const darkness = SHADES.map((s) => contrastRatio('#FFFFFF', scale[s]))
    for (let i = 1; i < darkness.length; i++) {
      expect(darkness[i], `${seed}: shade ${SHADES[i]} not darker than ${SHADES[i - 1]}`).toBeGreaterThan(darkness[i - 1])
    }
  })

  it('rejects invalid seeds by falling back to the default', () => {
    expect(scaleFromSeed('not-a-color')).toEqual(SLATE)
  })
})
