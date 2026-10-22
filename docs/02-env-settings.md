# Step 02 — Environment variables and dev/prod settings

Status: **done** (2026-10-22)

## Context
`settings.py` had Django's `SECRET_KEY` hardcoded and committed, along with `DEBUG = True` and an empty `ALLOWED_HOSTS`. Secrets should come from the environment, and development and production need different settings.

## What changed
- Added the dependency `django-environ==0.14.0`. All backend dependencies are pinned in `finco_ai/requirements.txt`.
- `finco_ai/finco_ai/settings.py` became the package `settings/`:
  - `base.py`: shared settings. It reads real environment variables first, then `finco_ai/.env`. It requires `SECRET_KEY`. `DATABASES` comes from `DATABASE_URL` and defaults to SQLite. It sets `STATIC_ROOT = staticfiles/`.
  - `dev.py`: `DEBUG` (default True) and `ALLOWED_HOSTS` (default `localhost,127.0.0.1`) come from env; email goes to the console.
  - `prod.py`: `DEBUG=False`, a **required** `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, an SSL redirect, secure cookies, and HSTS (default 3600s; the subdomain and preload options are opt-in). `BEHIND_PROXY=True` makes Django trust `X-Forwarded-Proto`.
- `manage.py` defaults to `finco_ai.settings.dev`; `wsgi.py` and `asgi.py` default to `finco_ai.settings.prod`.
- `finco_ai/.env` is local and gitignored, with a **newly generated** key. The old key is in commit `9340ff9`, so it is considered leaked and is no longer used.
- `finco_ai/.env.example` is a committed template that documents every variable.
- `.gitignore` now also excludes `.env` and `staticfiles/`.

## Verification
- `manage.py check` (dev) finds no issues.
- `check --deploy` on prod (with `ALLOWED_HOSTS` set) leaves only W005 and W021, the HSTS subdomain and preload opt-ins, which depend on the final domain.
- Without a `SECRET_KEY`, startup fails with `ImproperlyConfigured`.
- Importing `wsgi` loads `finco_ai.settings.prod` with `DEBUG=False`.
