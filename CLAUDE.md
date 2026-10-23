# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FincoAI is an AI-assisted bookkeeping app: the user describes financial events in chat, and the app turns them into double-entry accounting records against a hierarchical chart of accounts (the account levels Clase/Grupo/Cuenta/Subcuenta and codes like `1105`/`110505` follow the Colombian PUC style). The repo holds two independent projects:

- `finco_ai/` — Django 6.1 backend (Python 3.12, PostgreSQL via Docker). The outer folder holds `manage.py`; the inner `finco_ai/finco_ai/` is the settings package.
- `frontend_finco_ai/` — React 19 + TypeScript + Vite 8 frontend, with the React Compiler on (Babel preset in `vite.config.ts`). It uses MUI v9 and React Router v8.
- `docs/` — one plan file per completed build step (`NN-short-name.md`). The project is built one step at a time: when you finish a step, save its plan there and update this file if the architecture changed.

The frontend talks to the backend through a Django REST Framework API under `/api/`. In dev, Vite proxies `/api` to `127.0.0.1:8000`, so run both `runserver` and `npm run dev`, and open `http://localhost:5173` (Vite listens on IPv6 `localhost` only). The virtualenv is `.venv/` at the repo root. Backend dependencies are pinned in `finco_ai/requirements.txt`.

## Commands

Backend (run from `finco_ai/`, using the root venv). First-time setup: `..\.venv\Scripts\python.exe -m pip install -r requirements.txt`, then copy `.env.example` to `.env` and set `SECRET_KEY`. The database is PostgreSQL. Start it with `docker compose up -d` from `finco_ai/` (`docker-compose.yaml`). The container and Django both read the `POSTGRES_*` values from the same `.env`. Use `POSTGRES_HOST=127.0.0.1`: `localhost` hangs on Windows/Docker because it tries IPv6 first. Seed the chart of accounts with `manage.py loaddata financial_accounts`.

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
```

The frontend has no test runner configured. Check UI changes in the browser with the playwright-cli skill against `npm run dev`.

## Frontend architecture

- `src/main.tsx` sets up the providers: MUI `ThemeProvider` (theme in `src/theme.ts`) → `CssBaseline` → `RouterProvider`. There is no `App.tsx` and no global CSS; style with MUI `sx`.
- `src/router.tsx` uses data-mode routing (`createBrowserRouter`, imported from `react-router`, not `react-router-dom`). Every page is a child of `src/layouts/AppLayout.tsx`, which has the AppBar with the `NavLink` buttons and an `<Outlet/>`. Add new pages to both the router and `NAV_ITEMS`. `/` and unknown paths redirect to `/chat`.
- The code is organized by feature: `src/features/<feature>/` holds the page, a hook that owns its state, a `*Service.ts` for I/O, `types.ts` and `components/`.
- **Chat (`/chat`)**: `useChat` owns the message state. `chatService.sendMessage()` is currently a **mock** (a delay plus an echo) and is the one place to connect the backend. Messages are not persisted.
- **Ledger (`/ledger`)**: a manual journal-entry form plus the list of saved entries. It uses the real API through `ledgerService.ts`, which flattens DRF errors into "Line N: …" messages.
  - `useLedgerForm` owns the form state and enforces debit XOR credit per line and balanced totals.
  - Money is handled as **integer cents** (`money.ts`), never floats, and sent to the API as decimal strings. Dates are built in local time (`dates.ts`), not UTC.
  - The lines render as a table on `sm` screens and up, and as stacked cards on phones.

MUI v9 / theming gotchas:
- `TextField` takes `slotProps.input` / `slotProps.htmlInput`; `InputProps`/`inputProps` were removed.
- The theme uses `colorSchemes` (light and dark, following the OS), so set palette colors per scheme. Use `theme.applyStyles('dark', …)` for dark-only styles.
- A numeric `borderRadius` in `sx` is multiplied by `theme.shape.borderRadius` (12), so use px strings for exact radii.
- Lint rules: component files may only export components (react-refresh), and `verbatimModuleSyntax` requires `import type` for type-only imports.
- `react-hooks/set-state-in-effect` rejects effects that call a function which sets state synchronously. For data loading, set state only inside the promise callbacks (see `useLedgerData`).
- Icon modules use `…Outlined` names (`DeleteOutlined`, `ErrorOutlined`); `…Outline` doesn't exist.
- In a `tableLayout: 'fixed'` table, a `padding="checkbox"` cell ignores its `width`, so use a plain cell with `px`.

## Backend architecture

Settings are split up in `finco_ai/finco_ai/settings/`:
- `base.py` holds the shared settings. It reads values with `django-environ` from real environment variables first, then from `finco_ai/.env` (gitignored; the template is `.env.example`).
- `SECRET_KEY` and the `POSTGRES_*` connection values (`DB`, `USER`, `PASSWORD`, `HOST`, `PORT`) are required in every environment.
- `dev.py` is the default for `manage.py`. `prod.py` is the default for `wsgi.py` and `asgi.py`; it forces `DEBUG=False`, requires `ALLOWED_HOSTS` and enables the HTTPS/HSTS security settings.
- Switch environments with `DJANGO_SETTINGS_MODULE=finco_ai.settings.prod`. Check production settings with `manage.py check --deploy`.
- Never hardcode secrets: add new ones to `.env.example` and read them with `env(...)`.

Each domain is its own Django app: `financial_accounts`, `transactions`, `ai_chat`, `dashboard`. All are in `INSTALLED_APPS`. `ai_chat` and `dashboard` have no views yet.

API (Django REST Framework, `REST_FRAMEWORK` in `base.py`):
- Each app has a `urls.py`, included under `api/` in `finco_ai/urls.py`.
- Endpoints:
  - `GET /api/accounts/?postable=true` (`financial_accounts.views`)
  - `GET/POST /api/transactions/` (`transactions.views`)
- **No auth yet**: there are no authentication classes and permissions are `AllowAny`. Every view scopes data with `finco_ai.identity.get_user_id(request)`, which returns `settings.DEFAULT_USER_ID` (default `demo-user`). It is the single place to add Firebase ID-token verification. Never read `user_id` from the request body.
- Money is serialized as decimal strings (`COERCE_DECIMAL_TO_STRING`).

Data model conventions, used in every model:
- UUID primary keys, `created_at` / `updated_at` timestamps, and an explicit `Meta.db_table` (snake_case plural, e.g. `ledger_entries`).
- Ownership is a plain `user_id = CharField(max_length=128, db_index=True)` that holds a **Firebase UID**. Auth will be done by Firebase, not Django: don't add a User model or ForeignKeys to `auth.User`. (`settings/base.py` still lists the default `django.contrib.auth`/`admin`/`sessions` apps from the scaffold.)

How the models relate:
- `FinancialAccount` is a self-referencing tree (`parent`, with `on_delete=PROTECT`). Each account has a `code`, a `level` (1–4), a `nature` (DEBIT/CREDIT) and an `account_type` (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE). `can_receive_movement` marks the leaf accounts that can be posted to. Codes are unique per user (`uniq_financial_account_user_code`), but the field also has `unique=True`, so right now codes are unique across all users.
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
- `TIME_ZONE` is `UTC`, so the server-side default for `applied_date` is the UTC date. The frontend always sends the local date.
- `ai_chat` has `Conversation` (owned by `user_id`) and `ConversationMemory` (a one-to-one rolling `summary` used as LLM context).
