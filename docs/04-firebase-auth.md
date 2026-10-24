# Step 04 — Firebase authentication (app + Django admin)

Status: **code done** (2026-10-24). Live sign-in still has to be verified once the Firebase keys are added (see "Pending").

## Context
Before this step, every API request acted as the placeholder `demo-user`, and there was no login. Firebase is now the **only identity provider**:
- the app has login, logout and sign-up, and every route is protected;
- every API call verifies the Firebase ID token;
- **no passwords are stored in Postgres**.

Django admin is kept, and it shows a record of every Firebase user.

Decisions:
- Sign-in methods: Email/password + Google.
- Open sign-up.
- Each new user automatically gets their own default chart of accounts.
- Admin login also goes through Firebase, limited to `FIREBASE_ADMIN_UIDS`.

## Two kinds of users, kept separate
| Table | Who | Password |
|---|---|---|
| `app_users` (`users.AppUser`) | every Firebase user: uid, email, name, provider, last seen | none; Firebase holds credentials |
| `auth_user` (Django) | admin staff only, created on their first Firebase admin login | **unusable** (`!…`); no hash ever stored |

`AUTHENTICATION_BACKENDS` only contains `users.backends.FirebaseAdminBackend`, so password login to admin is impossible even if a password were set.

## Backend
- **Dependency:** `firebase-admin==7.7.0`.
- **`users` app:**
  - `firebase.py`: `get_app()` initializes the SDK from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, and raises a clear `ImproperlyConfigured` naming the missing keys. `verify_id_token()` allows 5s of clock skew; it is the single function the tests patch.
  - `authentication.FirebaseAuthentication` (DRF):
    - reads `Authorization: Bearer <token>`; a missing, malformed, invalid or expired token gets **401** (`WWW-Authenticate: Bearer`);
    - `sync_app_user()` creates or refreshes the `AppUser`, updating `last_seen_at` at most once every 5 minutes;
    - **a new user gets `seed_default_chart(uid)`**.
  - `GET /api/me/` returns the current profile. The frontend calls it after sign-in so the profile and chart exist right away.
  - `backends.FirebaseAdminBackend`:
    - verifies the token with `check_revoked=True` and requires the uid to be in `FIREBASE_ADMIN_UIDS`;
    - runs `get_or_create` on `auth_user` (`username=uid`, staff + superuser, unusable password).
  - `admin_views.admin_login` + `templates/users/admin_login.html`:
    - replaces `/admin/login/`; it is routed before `admin.site.urls`;
    - the page uses the Firebase JS SDK 13.1.0 from gstatic, with Google or email sign-in and in-memory persistence;
    - it posts the ID token with CSRF; the view logs in and redirects to a safe `next`, or answers 403 with "not an administrator".
  - The `AppUser` admin is read-only and has no "add" button.
  - `manage.py reassign_user_data --from <old> --to <uid> [--replace]` moves accounts, transactions and conversations. `--replace` drops the target's auto-seeded chart first, but only when it has no entries.
  - `testing.FirebaseAuthMixin`: a token `token:<uid>` verifies as that uid, and `expired` raises an expiry.
- **`financial_accounts/provisioning.py`:** `seed_default_chart(user_id)` copies the 43-account fixture template with new UUIDs and links parents by code. It is idempotent and atomic.
- **Migration `financial_accounts/0002_code_unique_per_user_only`:** removes `unique=True` from `code`. The `(user_id, code)` constraint stays.
- **Settings:**
  - DRF uses `FirebaseAuthentication` + `IsAuthenticated` by default.
  - `AUTHENTICATION_BACKENDS` contains only the Firebase admin backend; `LOGIN_URL='admin:login'`; `SESSION_COOKIE_AGE` is 8 hours.
  - The `FIREBASE_*` settings default to empty, so the tests run without secrets.
  - `DEFAULT_USER_ID` is removed.
- **`finco_ai/identity.get_user_id`:** now returns `request.user.firebase_uid`.
- **Admin registrations:** `FinancialAccount`, `Transaction` (with a `LedgerEntry` inline) and `Conversation` (with a memory inline).
- **Tests:** 38 in total, all passing. The 17 existing transaction tests now run through the mocked Firebase auth; the 21 new ones in `users/tests.py` cover:
  - 401 cases;
  - registration and seeding, and no duplicates on later requests;
  - data isolation between users, including posting to another user's account;
  - the admin login: allowed, rejected, password login impossible, unsafe `next` ignored;
  - the reassign command.

## Frontend
- **Dependency:** `firebase` 13.1.0. `frontend_finco_ai/.env.example` documents `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`; `src/env.d.ts` types them.
- **`src/lib/firebase.ts`:** `auth` is `null` when the config is missing, and the login page then shows a warning.
- **`src/lib/apiClient.ts`:** shared `apiFetch` + `ApiError`, moved out of `ledgerService`. It sends `Bearer <getIdToken()>` and signs out on a 401.
- **`src/features/auth/`:**
  - `authService` (email sign-in and sign-up with a display name, Google popup, password reset, sign-out, friendly error messages);
  - `authContext` / `AuthProvider` / `useAuth` (`onAuthStateChanged`; calls `/api/me/` after sign-in);
  - `RequireAuth` (spinner while loading, otherwise a redirect to `/login` that remembers `from`);
  - `LoginPage` (Sign in / Create account tabs, Forgot password, Continue with Google).
- **Router:** `/login` is public; everything else sits under `RequireAuth`.
- **`AppLayout`:** a `UserMenu` (avatar or initials, name and email, Log out); the nav buttons are icons only on phones.

## Verification done
- `manage.py check` and `makemigrations --check` are clean, the migrations are applied, and the 38 tests pass.
- `npm run build` and `npm run lint` are clean.
- Live API through the proxy: no token, or a `Token` scheme, gets 401. A Bearer token with keys missing gets `ImproperlyConfigured` naming the missing keys.
- `/admin/` redirects to `/admin/login/?next=/admin/`, which renders the Firebase sign-in page.
- Browser: `/ledger` and `/chat` redirect to `/login`, the "Firebase is not configured" warning shows, the buttons are disabled, the Create account tab shows the Name field, there's no horizontal overflow at 390px, and the console has no errors.

## Pending (needs real Firebase keys)
1. Fill the `FIREBASE_*` values in `finco_ai/.env` and the `VITE_FIREBASE_*` values in `frontend_finco_ai/.env`. In the Firebase console, enable the **Email/Password** and **Google** providers.
2. End-to-end checks:
   - sign up, then land on `/chat`;
   - `/ledger` shows the seeded chart;
   - save an entry, log out, log back in, and the entry is still there;
   - a wrong password shows a friendly error;
   - Google sign-in works (manual check).
3. Put your UID in `FIREBASE_ADMIN_UIDS`, sign in at `/admin/`, and confirm that `auth_user.password` starts with `!`.
4. Move the old data:
   `manage.py reassign_user_data --from demo-user --to <your UID> --replace`
   Use `--replace` because your first login seeds an empty chart.
