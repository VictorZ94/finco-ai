# Step 07 — Frontend refactor (axios, TanStack Query, react-hook-form + zod)

## Why
Each feature hand-rolled its own I/O and form state. `apiFetch` wrapped `fetch`. `useLedgerData`, `useDashboard` and `AuthProvider` kept their own loading, error and stale-response flags in `useState`/`useEffect`. The ledger and login forms validated by hand with one `useState` per field.

This step swaps that plumbing for standard libraries and applies the `vercel-react-best-practices` rules that fit a Vite SPA:
- **HTTP:** axios.
- **Server state:** TanStack Query, behind feature hooks.
- **Forms:** react-hook-form with zod schemas.

Decisions taken with the user:
- validation uses **zod**;
- the forms that moved are **ledger entry** and **login / sign-up / reset**;
- the **profile** also goes through TanStack Query;
- **manual memoization** is removed (the React Compiler is on).

Left out: lazy routes, React Query devtools, and the chat input as a form.

There are no visual or behavior changes, apart from login errors now showing under each field.

## Libraries
| Package | Version | Note |
|---|---|---|
| `axios` | 1.20 | |
| `@tanstack/react-query` | 5.104 | |
| `react-hook-form` | 7.91 | |
| `zod` | 4.6 | |
| `@hookform/resolvers` | **5.9.2** | 6.0.0 (6 days old) fails `npm install` because its own optional peers conflict (`effect@^4` vs `@typeschema`). 5.9.2 supports zod 4. |

## Layers per feature
```
features/<feature>/
  <feature>Service.ts   I/O only: api.get/post/patch(...) → .data
  queries.ts            query keys + queryOptions(...)
  use<...>.ts           hooks wrapping useQuery/useMutation (what components call)
  <form>Schema.ts       zod schema (+ .test.ts)
```

### HTTP (`src/lib/apiClient.ts`)
- `api = axios.create({ baseURL: '/api' })`.
- **Request interceptor:** adds the Firebase ID token (`getIdToken()` refreshes it). With no signed-in user it rejects with `ApiError(401)`.
- **Response interceptor:** a 401 signs the user out.
- **Error conversion:** every failure becomes an `ApiError`, via `toApiError`. It flattens nested DRF errors (`Line 1: …`), removes duplicates, and falls back to "Is the backend running?" for network errors or HTML responses.

### Server state (`src/lib/queryClient.ts`)
- **Defaults:** `staleTime` is 30 s and there is no refetch on window focus. A 4xx `ApiError` is never retried; other errors are retried once.
- `Register.defaultError = ApiError`, so `error.messages` is typed in every component.
- **Ledger:** `useAccounts()` and `useTransactions()` run in parallel. `useCreateTransaction()` prepends the new entry to `['transactions']` (no refetch) and invalidates `['dashboard']`.
- **Dashboard:** `useDashboardSummary(month)` uses `placeholderData: keepPreviousData`. The old month stays on screen, dimmed (`isPlaceholderData`), until the new one arrives; this replaced the hand-made stale-month logic.
- **Profile:**
  - `useProfile()` loads `['me', uid]` (`staleTime: Infinity`).
  - `ThemeColorProvider` always reads it, so the first fetch after sign-in registers the user, as `AuthProvider` used to.
  - `useSaveAccentColor()` writes the PATCH response into the cache.
  - After sign-up sets the name, `LoginPage` invalidates `['me']`.
- **Auth:** `AuthProvider` now keeps only the Firebase session, and calls `queryClient.clear()` on sign-out.
- **Chat:** messages stay in local state, while `isSending` and `error` come from a `useMutation` around the mock `sendMessage`.

### Forms
- **`entrySchema.ts`:**
  - **One refinement:** the fields are plain strings and every rule lives in a single `superRefine`, because zod skips an object's refinements once a field fails and all rules should report together.
  - **Rules:** applied date; supplier ≤ 255; ≥ 2 lines; an account per line; valid amounts; exactly one of debit or credit > 0; balanced totals.
  - **Output:** `.transform` produces the API payload (`NewTransaction`), and `useForm<EntryFormValues, unknown, NewTransaction>` hands it to `handleSubmit`.
- **`EntryForm`** is self-contained (`useEntryForm()` + `useCreateTransaction()`), and `LedgerPage` only loads data.
  - `useFieldArray` keys the lines.
  - Live totals, the balance chip and the hint each live in a small component with `useWatch({ compute })`, so typing re-renders only them.
  - The ticking "Current date" field is its own component.
  - The snackbar moved here from `LedgerPage`.
- **`authSchemas.ts`:**
  - `signInSchema` and `signUpSchema` (password ≥ 6) share `emailSchema`.
  - `LoginPage` uses one form for both tabs, with a resolver that follows the active tab, so the typed email survives a switch. RHF reassigns its options on every render, so the switch takes effect.
  - "Forgot password?" calls `trigger('email')`. Firebase errors go into `setError('root')`, and Google sign-in and the reset email are mutations.

### Found during verification: `register` + React Compiler
After a successful save, `reset(emptyEntry())` cleared the amounts (which use `Controller`) but **not** Supplier/Description (which used `register`).
- **Cause:** `reset(values)` empties RHF's field registry and expects each input's ref callback to run again on the next render. The React Compiler memoizes the `register()` props, so React never re-attaches the ref and the uncontrolled input keeps the old text.
- **Fix:** `src/components/FormTextField.tsx` is a controlled MUI TextField built on `useController`, used for every text field in both forms. It also fixes an older glitch where the floating label overlapped typed text in the supplier field.
- **Rule:** use `FormTextField`/`Controller`, not `register`.

### Best-practice cleanups
- **No more manual memoization:** removed `useMemo` from `ThemeColorProvider` (theme, context value) and `AppearanceDialog`, because the compiler covers them.
- **Hoisted preset scales:** `AppearanceDialog` builds `PRESET_SCALES` once at module level instead of 8 scales per render.
- **Already compliant:** `@mui/x-charts` uses its path import (`@mui/x-charts/BarChart`), and MUI imports are per component.

### Removed
`apiFetch`, `useLedgerData.ts`, `useLedgerForm.ts`, `useDashboard.ts`, `LedgerLine` (the `key` field), and the `profile` field of `useAuth()`.

## Verification
- **Automated:**
  - `npm run build`, `npm run lint` and `npm run test` pass: 52 tests, including new tests for `entrySchema`, `authSchemas` and `toApiError`.
  - Backend `manage.py test`: 56 OK.
- **Browser** (playwright-cli, throwaway `finco-e2e+refactor{1,2}@example.com` accounts, deleted afterwards along with their rows):
  - **Login:**
    - an empty submit shows "Enter your email." and "Enter your password.";
    - "Forgot password?" with no email shows an email error;
    - the email survives a tab switch;
    - "Use at least 6 characters." appears on sign-up;
    - a wrong password shows "Wrong email or password.".
  - **Ledger:**
    - Save is disabled with the hint "Line 1: choose an account.";
    - a debit locks the credit;
    - the chip shows "Difference $ 10.000" and then "Balanced", and the totals update;
    - saving gives "Entry #0005 saved", the list updates with no GET, and every field resets (the applied date to today);
    - a mocked 400 shows "Line 1: Server says no." and keeps the form.
  - **Dashboard:**
    - the figures update after a save with no reload (one `GET summary`);
    - on a previous-month switch, the old figures stay dimmed (`aria-busy`) until the new data arrives.
  - **Appearance:** two quick picks send 1 PATCH, and the color persists after a reload with `localStorage` cleared.
  - **Sign-out:** a second user sees none of the first user's entries and gets the empty dashboard.
  - **Layout:** at 1440px and 390px it looks the same as before, with no horizontal overflow.
