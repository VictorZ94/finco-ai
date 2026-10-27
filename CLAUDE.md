# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FincoAI is an AI-assisted bookkeeping app: the user describes financial events in chat, and the app turns them into double-entry accounting records against a hierarchical chart of accounts (the account levels Clase/Grupo/Cuenta/Subcuenta and codes like `1105`/`110505` follow the Colombian PUC style). The repo holds two independent projects:

- `finco_ai/` — Django 6.1 backend (Python 3.12, PostgreSQL via Docker). The outer folder holds `manage.py`; the inner `finco_ai/finco_ai/` is the settings package.
- `frontend_finco_ai/` — React 19 + TypeScript + Vite 8 frontend, with the React Compiler on (Babel preset in `vite.config.ts`). It uses MUI v9 and React Router v8.
- `docs/` — one plan file per completed build step (`NN-short-name.md`). The project is built one step at a time: when you finish a step, save its plan there and update this file if the architecture changed.

The frontend talks to the backend through a Django REST Framework API under `/api/`. In dev, Vite proxies `/api` to `127.0.0.1:8000`, so run both `runserver` and `npm run dev`, and open `http://localhost:5173` (Vite listens on IPv6 `localhost` only). The virtualenv is `.venv/` at the repo root. Backend dependencies are pinned in `finco_ai/requirements.txt`.

## Commands

Backend (run from `finco_ai/`, using the root venv). First-time setup: `..\.venv\Scripts\python.exe -m pip install -r requirements.txt`, then copy `.env.example` to `.env` and set `SECRET_KEY`. The database is PostgreSQL. Start it with `docker compose up -d` from `finco_ai/` (`docker-compose.yaml`). The container and Django both read the `POSTGRES_*` values from the same `.env`. Use `POSTGRES_HOST=127.0.0.1`: `localhost` hangs on Windows/Docker because it tries IPv6 first. Firebase keys go in `finco_ai/.env` (`FIREBASE_*`, see `.env.example`) and `frontend_finco_ai/.env` (`VITE_FIREBASE_*`, see `frontend_finco_ai/.env.example`). New users get their chart of accounts automatically on first sign-in. To move data between owners, run `manage.py reassign_user_data --from <old> --to <uid> [--replace]`.

```powershell
..\.venv\Scripts\python.exe manage.py runserver
..\.venv\Scripts\python.exe manage.py makemigrations
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py test                                  # all tests
..\.venv\Scripts\python.exe manage.py test transactions                     # one app
..\.venv\Scripts\python.exe manage.py test transactions.tests.SomeTest.test_x   # one test
```

Frontend (run from `frontend_finco_ai/`):

```powershell
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build (type-check + bundle)
npm run lint      # eslint .
npm run test      # vitest: palette contrast, money/months helpers, form schemas, API error mapping
```

Frontend unit tests use Vitest (pure logic only, no component tests yet). Check UI changes in the browser with the playwright-cli skill against `npm run dev`.

## Frontend architecture

- `src/main.tsx` sets up the providers: `QueryClientProvider` (`src/lib/queryClient.ts`) → `AuthProvider` → `ThemeColorProvider` (MUI `ThemeProvider` + `CssBaseline`, theme from `src/theme/index.ts`) → `RouterProvider`. There is no `App.tsx` and no global CSS; style with MUI `sx`.
- `src/router.tsx` uses data-mode routing (`createBrowserRouter`, imported from `react-router`, not `react-router-dom`). Every page is a child of `src/layouts/AppLayout.tsx`, which has the AppBar with the `NavLink` buttons and an `<Outlet/>`. Add new pages to both the router and `NAV_ITEMS`. `/`, unknown paths and the post-login default go to `/dashboard` (home).
- The code is organized by feature: `src/features/<feature>/` holds the page, `components/`, `types.ts`, schemas and UI-state hooks. Data access works like this (see `docs/07-frontend-refactor.md` and `docs/08-hooks-data-layer.md`):
  - **Server state lives in `src/hooks/<feature>/`** (`hooks/dashboard/useDashboardSummary.ts`, `hooks/ledger/useLedgerQueries.ts`, `hooks/auth/useProfile.ts`; see `docs/08-hooks-data-layer.md`). Each hook calls `useQuery`/`useMutation` with an inline `queryFn`/`mutationFn` that uses the shared axios instance `api` from `src/lib/apiClient.ts` (`baseURL: '/api'`) and returns `.data`. URLs come from `src/lib/endpoints.ts`; use `params` for query strings. The hook file also exports its query keys (`dashboardKeys`, `ledgerKeys`, `profileKeys`), so other hooks can update or invalidate them. Never call `fetch`/`axios` anywhere else, and components only use these hooks. Errors are typed as `ApiError` (registered in `queryClient.ts`), so show `error.messages`.
  - `*Service.ts` files that remain wrap non-HTTP I/O: `authService.ts` (the Firebase SDK) and `chatService.ts` (the mock).
  - **Mutations update the cache** instead of refetching everything: creating an entry prepends it to `['transactions']` and invalidates `['dashboard']`.
  - **Forms use react-hook-form + zod.** The schema lives next to the feature (`entrySchema.ts`, `authSchemas.ts`) with a Vitest file. Use `src/components/FormTextField.tsx` (a controlled `useController` TextField) or `Controller`, **not `register`**: with the React Compiler, `register()` props are memoized, so `reset(values)` doesn't update uncontrolled inputs. Watch values for live UI (totals, hints) in small child components with `useWatch({ compute })`.
- **Auth** (`src/features/auth/`, `src/lib/`):
  - `AuthProvider` tracks only the Firebase session, with `onIdTokenChanged` (so profile changes such as the sign-up name show up). `useAuth()` returns `{ status: 'loading' | 'signedIn' | 'signedOut', user }`. On sign-out it calls `queryClient.clear()`, so the next user never sees cached data.
  - The backend profile is a query: `useProfile()` (key `['me', uid]`, `GET /api/me/`). `ThemeColorProvider` always reads it, so the first fetch after sign-in registers the user and seeds their chart. `useSaveAccentColor()` PATCHes the color and writes the result into the cache.
  - `RequireAuth` guards every route except `/login`.
  - `LoginPage` offers email sign-in and sign-up, Google, and password reset. One form serves both tabs (the resolver switches between `signInSchema` and `signUpSchema`), so the typed email survives a tab switch. Firebase errors are mapped by `authService.friendlyAuthError` into `setError('root')`; Google sign-in and the reset email are mutations.
  - **All API calls go through `src/lib/apiClient.ts` `api`** (axios): a request interceptor adds `Authorization: Bearer <ID token>`; a response interceptor signs out on a 401 and turns every failure into `ApiError` with flattened DRF messages (`toApiError`, tested).
  - `src/lib/firebase.ts` exports `auth = null` when the `VITE_FIREBASE_*` values are missing.
- **Dashboard (`/dashboard`, home)**: `useDashboardSummary(month)` loads `GET /api/dashboard/summary/?month=YYYY-MM` with `placeholderData: keepPreviousData`; the page dims the previous month while `isPlaceholderData`.
  - It shows the key figures (`KeyFigures`) and a 6-month `IncomeExpenseChart` (`@mui/x-charts` `BarChart`). Chart colors come from `useBrand()`: income in 400, expenses in 700.
  - `MonthSelector` can't go past the current month. Month helpers live in `features/dashboard/months.ts`, with English month names.
- **Shared helpers** live in `src/lib/`:
  - `money.ts`: integer cents. Use `toCents` for user input and `apiToCents` for signed API strings; `formatCents`, `formatApiAmount` and `formatCompact` format them.
  - `dates.ts`: local-time dates.
  - `apiClient.ts`, `queryClient.ts` and `firebase.ts`.
- **Chat (`/chat`)**: `useChat` keeps the messages in local state and sends through a `useMutation`. `chatService.sendMessage()` is currently a **mock** (a delay plus an echo). When the `ai_chat` API exists, replace it with a `hooks/chat/` mutation and an `endpoints.chat` entry. Messages are not persisted.
- **Ledger (`/ledger`)**: a manual journal-entry form plus the list of saved entries. `LedgerPage` loads accounts and entries with `useAccounts()`/`useTransactions()`; `EntryForm` is self-contained (`useEntryForm()` + `useCreateTransaction()`).
  - `entrySchema.ts` holds the rules (debit XOR credit per line, at least 2 lines, balanced totals) in one `superRefine` (zod skips an object's refinements once a field fails), and its `.transform` outputs the API payload, so `handleSubmit` receives a `NewTransaction`. The hint next to Save is `firstProblem(values)`.
  - `useFieldArray` provides the line keys. The debit/credit lock disables the TextField, not the `Controller`, so the value stays registered.
  - Money is handled as **integer cents** (`src/lib/money.ts`), never floats, and sent to the API as decimal strings. Dates are built in local time (`src/lib/dates.ts`), not UTC.
  - The lines render as a table on `sm` screens and up, and as stacked cards on phones.

Visual design: professional, monochrome, user-selectable color (details in `docs/05-visual-design.md`; the user steers design with references):
- **One brand scale per user.** `src/theme/index.ts` `createAppTheme(scale)` builds a light-only theme from `palette.brand` (50…950).
  - Components use `'brand.N'` in `sx`, `useBrand()` (`src/theme/useBrand.ts`) for SVG, borders and shadows, and `cardSx(brand)` for white cards.
  - **Never hardcode brand hex values** or import a static scale. The only fixed color is `danger` in `tokens.ts`, for errors and an unbalanced difference; "Balanced" and info stay in the brand hue.
- **Contrast is guaranteed** by `src/theme/palette.ts`: `buildScale` keeps the reference lightness, and a guard enforces the `CONTRAST_RULES`. If you add a new color pairing (fg on bg), add it to `CONTRAST_RULES`, and `palette.test.ts` will check every preset and hue.
- **The user's choice:** UserMenu → Appearance (`features/appearance/`), held by `ThemeColorProvider` (priority: session choice > `useProfile().data.accent_color` > `localStorage` > default Slate). It is saved via `useSaveAccentColor()` (`PATCH /api/me/`, debounced 600 ms).
- **Type:** Geist. **Every amount and account code uses the `money` variant** (or `fontVariantNumeric: 'tabular-nums'` in inputs and table cells). No all-caps.
- **Shape:** white cards with radius 24, controls 12, pills 999 (`radius`). Concentric rings (`patterns.ts`) only on tinted panels (login, chat empty state).
- **Motion:** quiet. `revealSx(i)` once per page; reduced motion is handled globally. The ripple is off, and focus is a 2px brand-400 outline.

MUI v9 / theming gotchas:
- `TextField` takes `slotProps.input` / `slotProps.htmlInput`; `InputProps`/`inputProps` were removed.
- Alert styling uses `styleOverrides.root.variants` (props → style). Keys like `standardError` no longer exist.
- A numeric `borderRadius` in `sx` is multiplied by `theme.shape.borderRadius` (12), so use px strings, or `radius.*` from `tokens.ts`.
- Inside flex rows, give shrinking children `minWidth: 0`. The routed-page layer in `AppLayout`, and amount inputs on phones, overflowed without it.
- Lint rules: component files may only export components (react-refresh), and `verbatimModuleSyntax` requires `import type` for type-only imports.
- `react-hooks/set-state-in-effect` rejects effects that call a function which sets state synchronously. Load data with TanStack Query, not effects.
- The React Compiler memoizes everything: don't add `useMemo`/`useCallback`, and don't rely on a callback ref re-running on each render (see the `register` note above).
- Icon modules use `…Outlined` names (`DeleteOutlined`, `ErrorOutlined`); `…Outline` doesn't exist.
- In a `tableLayout: 'fixed'` table, a `padding="checkbox"` cell ignores its `width`, so use a plain cell with `px`.

## Backend architecture

Settings are split up in `finco_ai/finco_ai/settings/`:
- `base.py` holds the shared settings. It reads values with `django-environ` from real environment variables first, then from `finco_ai/.env` (gitignored; the template is `.env.example`).
- `SECRET_KEY` and the `POSTGRES_*` connection values (`DB`, `USER`, `PASSWORD`, `HOST`, `PORT`) are required in every environment.
- `dev.py` is the default for `manage.py`. `prod.py` is the default for `wsgi.py` and `asgi.py`; it forces `DEBUG=False`, requires `ALLOWED_HOSTS` and enables the HTTPS/HSTS security settings.
- Switch environments with `DJANGO_SETTINGS_MODULE=finco_ai.settings.prod`. Check production settings with `manage.py check --deploy`.
- Never hardcode secrets: add new ones to `.env.example` and read them with `env(...)`.

Each domain is its own Django app: `users`, `financial_accounts`, `transactions`, `ai_chat`, `dashboard`. All are in `INSTALLED_APPS`. `ai_chat` has no views yet.

API (Django REST Framework, `REST_FRAMEWORK` in `base.py`):
- Each app has a `urls.py`, included under `api/` in `finco_ai/urls.py`.
- Endpoints:
  - `GET /api/accounts/?postable=true` (`financial_accounts.views`)
  - `GET/POST /api/transactions/` (`transactions.views`)
  - `GET /api/dashboard/summary/?month=YYYY-MM` (`dashboard.views`; the figures come from `dashboard/services.build_summary`)
  - `GET/PATCH /api/me/` (`users.views`): PATCH only changes `accent_color`; identity fields are read-only
- **Auth is Firebase only** (`users` app):
  - `users.authentication.FirebaseAuthentication` + `IsAuthenticated` are the DRF defaults. Every request needs `Authorization: Bearer <Firebase ID token>`; otherwise it gets a 401.
  - The auth class verifies the token through `users.firebase.verify_id_token`, the only call into Firebase, and creates or refreshes a `users.AppUser` (`app_users` table, **no password**). On first sign-in it seeds the user's chart with `financial_accounts.provisioning.seed_default_chart`.
  - Views scope data with `finco_ai.identity.get_user_id(request)`, which returns `request.user.firebase_uid`. Never read `user_id` from the request body.
  - `GET /api/me/` returns the current user.
- **Django admin** is for staff only and also signs in through Firebase:
  - `/admin/login/` is replaced by `users.admin_views.admin_login`, a Firebase JS sign-in page that posts the ID token.
  - `users.backends.FirebaseAdminBackend` is the **only** entry in `AUTHENTICATION_BACKENDS`, so password login is impossible. It lets in only UIDs listed in `FIREBASE_ADMIN_UIDS`, and creates their `auth_user` row with an unusable password.
  - `auth_user` therefore holds only admin staff, never app users.
- **Tests:** use `users.testing.FirebaseAuthMixin` (it patches `verify_id_token`) and call `self.authenticate(uid)`. The token `token:<uid>` is valid, and `expired` raises an expiry. The `FIREBASE_*` settings default to empty, so the tests need no secrets.
- Money is serialized as decimal strings (`COERCE_DECIMAL_TO_STRING`).

Data model conventions, used in every model:
- UUID primary keys, `created_at` / `updated_at` timestamps, and an explicit `Meta.db_table` (snake_case plural, e.g. `ledger_entries`).
- Ownership is a plain `user_id = CharField(max_length=128, db_index=True)` that holds the **Firebase UID** (`AppUser.firebase_uid`). Don't add a custom Django User model or ForeignKeys to `auth.User`. `django.contrib.auth`, `admin` and `sessions` exist only for admin staff.

How the models relate:
- `FinancialAccount` is a self-referencing tree (`parent`, with `on_delete=PROTECT`). Each account has a `code`, a `level` (1–4), a `nature` (DEBIT/CREDIT) and an `account_type` (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE). `can_receive_movement` marks the leaf accounts that can be posted to. Codes are unique per user (`uniq_financial_account_user_code`). The default chart template is `financial_accounts/fixtures/financial_accounts.json`, which `seed_default_chart` copies with new UUIDs; don't `loaddata` it into a real database.
- `Transaction` is a journal entry with these fields:
  - `numbering`: sequential per user (`0001`, …), assigned by the serializer under a row lock, and unique per user.
  - `applied_date`: an editable `DateField`.
  - `created_at`: the system "current date", never editable.
  - `supplier` (free text) and `description`, both optional.

  Each `Transaction` has many `LedgerEntry` rows, each with `debit`/`credit` Decimals (18,2) against a `FinancialAccount` (`on_delete=PROTECT`). `Transaction.message_id` is a placeholder UUID that is meant to become a ForeignKey to a chat `Message` model, which doesn't exist yet.
- **Ledger rules**, enforced in `transactions/serializers.py` and backed by DB `CheckConstraint`s:
  - a line has a debit XOR a credit, and amounts are ≥ 0;
  - an entry has at least 2 lines, and Σ debit = Σ credit;
  - lines may only use the user's own accounts that have `can_receive_movement`.

  Tests live in `transactions/tests.py`.
- **Dashboard figures**, per user and filtered by `applied_date`:
  - **Income** = Σ(credit − debit) on INCOME, and **expenses** = Σ(debit − credit) on EXPENSE, both for the month.
  - **Assets**, **liabilities** and **net worth** are balances as of the month's last day.
  - Use ORM aggregation (`Sum(Case(When…))`, `TruncMonth`), never Python loops over entries.
- `TIME_ZONE` is `UTC`, so the server-side default for `applied_date` is the UTC date. The frontend always sends the local date.
- `ai_chat` has `Conversation` (owned by `user_id`) and `ConversationMemory` (a one-to-one rolling `summary` used as LLM context).
