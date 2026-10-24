# FincoAI

AI-assisted personal bookkeeping in Colombian pesos. You describe your income and expenses, and FincoAI records them as **double-entry accounting entries** against a PUC-style chart of accounts (Clase → Grupo → Cuenta → Subcuenta).

> **Status:** work in progress. Manual ledger entries, the dashboard and authentication work today. The chat assistant is still a placeholder, and the AI model is not connected yet.

## Features

- **Dashboard (home):**
  - net worth, income, expenses and net for any month, with a comparison to the previous month;
  - a 6-month income vs expenses chart.
- **Ledger:**
  - Record balanced journal entries. Every line has a debit **or** a credit, and an entry can't be saved until total debits equal total credits.
  - Each entry has an applied date (editable) and a system date (automatic), plus an optional supplier and description.
  - These rules are enforced in the UI, the API and the database.
- **Chart of accounts:** every new user automatically gets their own default chart (43 accounts).
- **Authentication with Firebase:**
  - email/password or Google sign-in, sign-up and password reset;
  - every API call verifies the Firebase ID token, and no passwords are stored in the database;
  - Django admin also signs in through Firebase, limited to an allow-list of admin UIDs.
- **Appearance:**
  - a professional, monochrome light theme;
  - each user can pick the app color (8 presets or a custom color);
  - the scale is generated automatically, with WCAG contrast guaranteed.
- **Chat:** the interface where you'll describe movements in plain words. For now it gives a placeholder reply.

## Tech stack

| Area | Technology |
|---|---|
| Backend | Python 3.12, Django 6.1, Django REST Framework, PostgreSQL 18 (Docker), Firebase Admin SDK |
| Frontend | React 19, TypeScript, Vite 8, MUI v9, MUI X Charts, React Router v8, Firebase JS SDK, Geist font |
| Tests | Django test runner (backend), Vitest (frontend logic) |

## Project structure

```
finco_ai/              Django backend (manage.py, apps, docker-compose.yaml)
  finco_ai/settings/   base.py, dev.py, prod.py
  users/               Firebase auth, AppUser profile, admin login
  financial_accounts/  chart of accounts + default chart provisioning
  transactions/        journal entries and ledger lines
  dashboard/           summary figures API
  ai_chat/             conversation models (AI not connected yet)
frontend_finco_ai/     React app (src/features/<feature>, src/theme, src/lib)
docs/                  one document per completed build step
```

## Getting started

### Prerequisites
- Python 3.12, Node.js 20+ and Docker.
- A Firebase project with the **Email/Password** and **Google** sign-in providers enabled.

### 1. Backend

```powershell
cd finco_ai
python -m venv ..\.venv
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env      # then fill in the values (see below)
docker compose up -d        # PostgreSQL
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py runserver
```

Fill in `finco_ai/.env`:
- `SECRET_KEY`;
- the `POSTGRES_*` values (use `POSTGRES_HOST=127.0.0.1`, because `localhost` hangs on Windows with Docker);
- the Firebase service-account values `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`;
- the web config `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN` and `FIREBASE_APP_ID`;
- `FIREBASE_ADMIN_UIDS` (who can open `/admin/`).

### 2. Frontend

```powershell
cd frontend_finco_ai
npm install
copy .env.example .env      # VITE_FIREBASE_* web config
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to Django on `127.0.0.1:8000`, so both servers must be running.

## Useful commands

| Command | Where | What it does |
|---|---|---|
| `manage.py test` | `finco_ai/` | Backend tests |
| `manage.py check --deploy --settings=finco_ai.settings.prod` | `finco_ai/` | Production settings check |
| `manage.py reassign_user_data --from <old> --to <uid> [--replace]` | `finco_ai/` | Move data between owners |
| `npm run build` | `frontend_finco_ai/` | Type-check + production build |
| `npm run lint` | `frontend_finco_ai/` | ESLint |
| `npm run test` | `frontend_finco_ai/` | Vitest (palette contrast, money and month helpers) |

## API overview

All endpoints require `Authorization: Bearer <Firebase ID token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET / PATCH | `/api/me/` | Current user profile; PATCH updates the app color |
| GET | `/api/accounts/?postable=true` | Chart of accounts (leaf accounts only with `postable`) |
| GET / POST | `/api/transactions/` | List / create balanced journal entries |
| GET | `/api/dashboard/summary/?month=YYYY-MM` | Monthly figures and a 6-month trend |

## Roadmap

The project is built one step at a time; each finished step is documented in [`docs/`](docs/).

1. Chat layout
2. Environment settings (dev/prod)
3. Manual ledger entries
4. Firebase authentication
5. Visual design and user-selectable color
6. Dashboard
7. *Next:* connect the AI model to the chat, so it turns plain-language messages into ledger entries
