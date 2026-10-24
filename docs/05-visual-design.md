# Step 05 — Visual design: professional monochrome, user-selectable color

Status: **done** (2026-10-24)

## Context
The UI started as stock MUI. A first attempt, a dark "Kanagawa nocturno" theme, was rejected before it was committed, as unprofessional and too high-contrast and colorful. The user then supplied a reference: two screenshots of a fintech UI kit built on **one slate-indigo scale** (50 `#F5F6FA` … 950 `#1D2434`). It uses white cards on a light page, large radii, tinted cards with faint concentric rings, tight medium-weight headings, plain-text tabs and pill tags.

The user also required that **each user can change the app color while keeping good contrast**.

## Design system (`src/theme/`)
- **One brand scale per user:** `palette.brand` (50…950). It is built by `createAppTheme(scale)` (`index.ts`), and every color comes from it. The only exception is `danger` (`#B4433E` on `#FBEDEC`) in `tokens.ts`, used for errors and an unbalanced difference. "Balanced", info and success all stay in the brand hue.
- **Roles:**
  | Role | Shade |
  |---|---|
  | page | 50 |
  | cards | white, 1px brand-100 border, a near-invisible shadow (`cardSx(brand)`) |
  | text | 950 |
  | secondary text | 600 |
  | placeholder | 400 |
  | primary action | 600 (hover 700) |
  | tags and Balanced | 200 fill with 900 text |
  | focus | a 2px brand-400 outline |
- **Light only.** The MUI ripple is off.
- **Type:** Geist (`@fontsource-variable/geist`).
  - Display headings: weight 600, tracking −0.035em. Other headings: −0.015em.
  - The `money` variant uses `tabular-nums` and is applied to every amount and account code.
  - Scale: 13/14/16/20/24/32/44. No all-caps.
- **Shape:** cards 24, controls 12, pills 999 (`radius` in `tokens.ts`).
- **Decoration:** `concentricRings(stroke)` (`patterns.ts`): faint rings and ticks, used only on tinted panels (the login brand panel at 400, the chat empty state at 200).
- **Motion:** `revealSx(i)` gives a 6px fade-up once per page. Reduced motion is handled globally.
- **Brand mark:** `components/BrandMark.tsx` (concentric arcs on a 950 tile, colored from the active scale) and `Wordmark.tsx`. The favicon is a static Slate version.

## User-selectable color with guaranteed contrast
- **`palette.ts`:**
  - `buildScale(seed)` keeps the seed's OKLCH hue and chroma (capped at 0.12, so colors stay professional), and reuses the **lightness of the reference scale** for every shade. Any hue therefore lands on similar contrast.
  - `ensureContrast`, inside `buildScale`, darkens or lightens the shades involved until all five rules pass:
    | Rule | Pair | Minimum |
    |---|---|---|
    | Text | 950 on 50 | 7:1 |
    | Secondary text | 600 on white | 4.5:1 |
    | Buttons | white on 600 | 4.5:1 |
    | Tags | 900 on 200 | 4.5:1 |
    | Panels | 950 on 400 | 4.5:1 |
  - The default seed returns the reference scale verbatim.
- **Presets:** Slate (default), Ocean, Teal, Forest, Clay, Plum, Graphite, Sand. There is also **Custom**, a native color input.
- **UI:** UserMenu → **Appearance** (`features/appearance/AppearanceDialog.tsx`) offers the swatches, the custom picker, a live preview (button, Balanced tag, totals row) and the measured contrast ratios.
- **State:** `ThemeColorProvider` builds the theme from the active seed and wraps `ThemeProvider` + `CssBaseline`. The active seed is, in priority order, the choice made in this session, then the profile's `accent_color`, then the `localStorage` cache (which prevents a flash of the default on reload), then the default. Saving to the profile is debounced by 600 ms, because the picker fires while dragging.
- **Backend:** `AppUser.accent_color` (`#RRGGBB` or blank), migration `users/0002_app_user_accent_color`. `GET/PATCH /api/me/` exposes it; identity fields are read-only. `AuthProvider` now keeps the `/api/me/` profile in context.
- **Tests:**
  - Vitest (`npm run test`), 28 palette tests: every preset, 36 hues × 3 saturations, extreme seeds (`#FFFF00`, `#00FF00`, black, white, magenta, cyan), shades strictly darkening, and the default equal to the reference.
  - Backend: 7 new `accent_color` tests (45 in total).

## Layout
- **App bar:** white with a hairline, the wordmark, and plain-text tabs (600 inactive, 950 active with an underline). The avatar is a 200 circle.
- **Chat:**
  - The empty state is a tinted 200 card with rings, the large heading "What moved today?" and white prompt pills.
  - User messages are 600 bubbles; assistant replies are white cards next to the mark.
  - The input is a white bar with a round 600 send button.
- **Ledger:**
  - The form and the saved entries are both white cards.
  - Totals sit below a 950 rule, with tabular figures.
  - The status tags are Balanced (brand) or Difference (danger).
  - Expanded entry lines sit in a brand-50 inset.
- **Login:** a split screen. The left side is a 400 tinted card with rings, the wordmark and "Gain control of your money"; the right side is a white form.

## Verification
- `npm run build`, `npm run lint` and `npm run test` are clean. The backend `manage.py test` passes all 45. No Kanagawa or Recursive leftovers remain.
- playwright-cli against the real Firebase project, with a throwaway sign-up deleted afterwards:
  - Screenshots of login, chat (empty and conversation) and ledger (unbalanced, balanced, saved and expanded, phone).
  - Presets change `--mui-palette-primary-main` (Slate `#3F5885` → Forest `#2C663E` → Ocean `#1E5B91`). The custom `#FFFF00` becomes a readable olive `#5C5C00`, with Text 14.3:1, Buttons 7.0:1 and Panels 4.8:1.
  - The color persists after a reload and is restored from the profile after clearing `localStorage`.
  - There is no horizontal overflow at 390px, and Geist loads.
