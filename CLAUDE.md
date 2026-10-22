# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FincoAI is an AI-assisted bookkeeping app: the user describes financial events in chat, and the app turns them into double-entry accounting records against a hierarchical chart of accounts (the account levels Clase/Grupo/Cuenta/Subcuenta and codes like `1105`/`110505` follow the Colombian PUC style). The repo holds two independent projects:

- `finco_ai/` — Django 6.1 backend (Python 3.12, SQLite). The outer folder holds `manage.py`; the inner `finco_ai/finco_ai/` is the settings package.
- `frontend_finco_ai/` — React 19 + TypeScript + Vite 8 frontend, with the React Compiler on (Babel preset in `vite.config.ts`). It uses MUI v9 and React Router v8.
- `docs/` — one plan file per completed build step (`NN-short-name.md`). The project is built one step at a time: when you finish a step, save its plan there and update this file if the architecture changed.

There is no git repo, no `requirements.txt`, and no API layer between the two yet. The virtualenv is `.venv/` at the repo root and only contains Django.

## Commands

Backend (run from `finco_ai/`, using the root venv):

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
- `src/router.tsx` uses data-mode routing (`createBrowserRouter`, imported from `react-router`, not `react-router-dom`). Every page is a child of `src/layouts/AppLayout.tsx` (AppBar + `<Outlet/>`). `/` and unknown paths redirect to `/chat`.
- The code is organized by feature: `src/features/<feature>/` holds the page, a hook that owns its state, a `*Service.ts` for I/O, `types.ts` and `components/`.
- **Chat (`/chat`)**: `useChat` owns the message state. `chatService.sendMessage()` is currently a **mock** (a delay plus an echo) and is the one place to connect the backend. Messages are not persisted.

MUI v9 / theming gotchas:
- `TextField` takes `slotProps.input` / `slotProps.htmlInput`; `InputProps`/`inputProps` were removed.
- The theme uses `colorSchemes` (light and dark, following the OS), so set palette colors per scheme. Use `theme.applyStyles('dark', …)` for dark-only styles.
- A numeric `borderRadius` in `sx` is multiplied by `theme.shape.borderRadius` (12), so use px strings for exact radii.
- Lint rules: component files may only export components (react-refresh), and `verbatimModuleSyntax` requires `import type` for type-only imports.

## Backend architecture

Each domain is its own Django app: `financial_accounts`, `transactions`, `ai_chat`, `dashboard`. **These apps are not in `INSTALLED_APPS` yet and have no migrations**, so add them to `settings.py` before running `makemigrations`. Views, URLs and tests are still empty stubs. Only `admin/` is routed.

Data model conventions, used in every model:
- UUID primary keys, `created_at` / `updated_at` timestamps, and an explicit `Meta.db_table` (snake_case plural, e.g. `ledger_entries`).
- Ownership is a plain `user_id = CharField(max_length=128, db_index=True)` that holds a **Firebase UID**. Auth will be done by Firebase, not Django: don't add a User model or ForeignKeys to `auth.User`. (`settings.py` still lists the default `django.contrib.auth`/`admin`/`sessions` apps from the scaffold.)

How the models relate:
- `FinancialAccount` is a self-referencing tree (`parent`, with `on_delete=PROTECT`). Each account has a `code`, a `level` (1–4), a `nature` (DEBIT/CREDIT) and an `account_type` (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE). `can_receive_movement` marks the leaf accounts that can be posted to. Codes are unique per user (`uniq_financial_account_user_code`), but the field also has `unique=True`, so right now codes are unique across all users.
- `Transaction` is a journal entry (`numbering`, `description`, `date`). Each one has many `LedgerEntry` rows, each with `debit`/`credit` Decimals (18,2) against a `FinancialAccount`. `Transaction.message_id` is a placeholder UUID that is meant to become a ForeignKey to a chat `Message` model, which doesn't exist yet.
- `ai_chat` has `Conversation` (owned by `user_id`) and `ConversationMemory` (a one-to-one rolling `summary` used as LLM context).
