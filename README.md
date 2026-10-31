# FincoAI

AI-assisted personal bookkeeping in Colombian pesos. You describe your income and expenses, and FincoAI records them as **double-entry accounting entries** against a PUC-style chart of accounts (Clase → Grupo → Cuenta → Subcuenta).

> **Status:** work in progress. Manual ledger entries, the dashboard, authentication and the chat agent work today.

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
- **Chat agent:** describe a movement in plain words ("I paid 80,000 for petrol with my Nubank card") and it is saved as a balanced entry.
  - It asks when the amount, the category or the payment method is missing. It never assumes how you paid.
  - It uses your existing accounts, and proposes a new one only when nothing fits; a new account is created only when you tap **Create account**.
  - It is built with LangChain on an LLM (Ollama cloud, Gemma 4 by default). The model only picks the accounts, through tools; the tools check every rule, and the server builds the balanced lines itself.
  - **Memory:** it remembers each conversation ("same as the first one, but 30,000"), and long chats are summarized automatically. Conversations are saved, and each entry links back to the message that created it.

## Tech stack

| Area | Technology |
|---|---|
| Backend | Python 3.12, Django 6.1, Django REST Framework, PostgreSQL 18 (Docker), Firebase Admin SDK |
| Chat agent | LangChain v1 (`create_agent` + tools), LangGraph Postgres checkpointer for memory, Ollama cloud (Gemma 4) via `langchain-ollama` |
| Frontend | React 19, TypeScript, Vite 8, MUI v9, MUI X Charts, React Router v8, axios, TanStack Query, react-hook-form + zod, Firebase JS SDK, Geist font |
| Tests | Django test runner (backend), Vitest (frontend logic) |

## Project structure

```
finco_ai/              Django backend (manage.py, apps, docker-compose.yaml)
  finco_ai/settings/   base.py, dev.py, prod.py
  users/               Firebase auth, AppUser profile, admin login
  financial_accounts/  chart of accounts + default chart provisioning
  transactions/        journal entries and ledger lines
  dashboard/           summary figures API
  ai_chat/             chat agent: conversations, LLM client, rules that record entries
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
- `FIREBASE_ADMIN_UIDS` (who can open `/admin/`);
- `OLLAMA_API_KEY` for the chat agent (create one at https://ollama.com/settings/keys). `OLLAMA_MODEL` defaults to `gemma4:31b`; set `OLLAMA_HOST=http://127.0.0.1:11434` to use a local model instead. Note that chat messages and account names are sent to `OLLAMA_HOST`.

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
| `npm run test` | `frontend_finco_ai/` | Vitest (palette contrast, money and month helpers, form schemas, API errors) |

## API overview

All endpoints require `Authorization: Bearer <Firebase ID token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET / PATCH | `/api/me/` | Current user profile; PATCH updates the app color |
| GET | `/api/accounts/?postable=true` | Chart of accounts (leaf accounts only with `postable`) |
| GET / POST | `/api/transactions/` | List / create balanced journal entries |
| GET | `/api/dashboard/summary/?month=YYYY-MM` | Monthly figures and a 6-month trend |
| GET / POST | `/api/chat/conversations/` | List / start chat conversations |
| GET / POST | `/api/chat/conversations/<id>/messages/` | History / send a message (the agent replies, and may save an entry) |
| POST | `/api/chat/conversations/<id>/account-proposal/` | Accept or decline a proposed new account |

## Roadmap

The project is built one step at a time; each finished step is documented in [`docs/`](docs/).

1. Chat layout
2. Environment settings (dev/prod)
3. Manual ledger entries
4. Firebase authentication
5. Visual design and user-selectable color
6. Dashboard
7. Frontend refactor: axios, TanStack Query, react-hook-form + zod
8. Hooks data layer
9. Chat agent: plain-language messages become ledger entries
