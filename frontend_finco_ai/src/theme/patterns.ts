/**
 * Faint concentric rings anchored at the bottom-right corner, as in the reference cards.
 * Use only on tinted panels (the login brand panel, the chat empty state).
 */
export function concentricRings(stroke: string, opacity = 0.5) {
  const circles = [120, 210, 300, 390]
    .map((r) => `<circle cx='100%' cy='100%' r='${r}' fill='none' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1'/>`)
    .join('')
  const lines = [0.12, 0.34, 0.56]
    .map((x) => `<line x1='${x * 100}%' y1='0' x2='${x * 100}%' y2='34' stroke='${stroke}' stroke-opacity='${opacity}' stroke-width='1'/>`)
    .join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>${lines}${circles}</svg>`
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
  }
}
