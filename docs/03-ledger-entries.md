# Step 03 — Manual ledger entries at `/ledger` (API + form)

Status: **done** (2026-10-24)

## Context
Before any AI writes accounting records, the user wants a reliable **manual** way to register movements, to prove the bookkeeping rules work. One movement is one double-entry **journal entry**: a `Transaction` with two or more `LedgerEntry` lines.

Requirements confirmed with the user:
- **Current date**: set by the system and never editable. This is `Transaction.created_at`.
- **Applied date**: defaults to today and can be edited.
- **Supplier**: optional free text.
- **Lines**: each line has an account and a **debit OR a credit**, never both.
- **Totals row** at the end. An entry can only be saved when Σ debit = Σ credit > 0, and this is enforced in both the UI and the API.

There is no edit or delete in this step.

## Backend
- **DRF:** added `djangorestframework==3.18.3` and registered `rest_framework`. The `REST_FRAMEWORK` settings in `settings/base.py`:
  - no authentication classes, and `AllowAny` permissions;
  - JSON only;
  - `COERCE_DECIMAL_TO_STRING`, so money is sent as strings.
- **User placeholder:** `finco_ai/finco_ai/identity.py` has `get_user_id(request)`, which returns `settings.DEFAULT_USER_ID` (env `DEFAULT_USER_ID`, default `demo-user`). This is the single swap point for Firebase.
- **Migration `transactions/0002_applied_date_supplier_ledger_rules`:**
  - `Transaction.date` (DateTime) is replaced by `applied_date` (Date, default `timezone.localdate`). The table was empty, so this was a drop and re-create.
  - Adds `Transaction.supplier` (optional).
  - Adds `UniqueConstraint(user_id, numbering)`.
  - `LedgerEntry.account` changes to `on_delete=PROTECT`.
  - Adds DB `CheckConstraint`s: `debit >= 0`, `credit >= 0`, and exactly one side > 0.
- **`transactions/serializers.py`:** these rules are checked:
  - Each line has a debit or a credit, not both and not neither.
  - Amounts are ≥ 0.
  - There are at least 2 lines.
  - Every account belongs to the user and has `can_receive_movement`.
  - The entry is balanced.

  `create()` runs atomically. It locks the user's existing entries, assigns the next `numbering` (`0001`, `0002`, …) and bulk-creates the lines. `id`, `numbering` and `created_at` are read-only, so client values for them are ignored.
- **Endpoints:**
  - `GET/POST /api/transactions/` returns the user's entries newest first, with their `lines`, `total_debit` and `total_credit`.
  - `GET /api/accounts/?postable=true` returns the user's leaf accounts, ordered by code.
- **Tests:** 17 in `transactions/tests.py`, covering the API rules, numbering, ownership, the postable filter, and the DB constraints when the API is bypassed.

## Frontend
- **Dev proxy:** `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`.
- **Navigation:** `AppLayout` now has **Chat** and **Ledger** buttons (`NavLink`, with the active one highlighted). The new route is `/ledger`.
- **`src/features/ledger/`:**
  - `ledgerService.ts`: `fetch` calls. DRF errors are flattened into readable messages; line errors arrive keyed by index (`{"lines": {"0": …}}`) and are shown as "Line 1: …".
  - `money.ts`: amounts are integer cents (input `50000`, `1500,5` or `99.99`) and are displayed as COP with `es-CO` formatting. `dates.ts` builds the local date and formats dates.
  - `useLedgerForm.ts`: form state. Typing a debit clears the credit, and the other way around. It also derives the totals, the difference, `isBalanced` and the list of problems that block saving.
  - `useLedgerData.ts` loads the accounts and entries and saves new ones. `useNow.ts` is a live clock for the "Current date" field.
- **`EntryForm`:**
  - **Header fields:** Current date (disabled, live), Applied date (date input), Supplier and Description.
  - **Lines:** a table on `sm` screens and up, and stacked cards with labeled amounts on phones. Each line has an account `Autocomplete`, Debit and Credit; the other side is disabled while one has a value. There is an "Add line" button, and an entry keeps at least 2 lines.
  - **Totals:** shows "No amounts yet", "Balanced" or "Difference: $X".
  - **Saving:** Save stays disabled until the entry is valid, with the first problem shown next to it. Server errors appear in an `Alert`; a successful save shows a snackbar ("Entry #0001 saved").
- **`EntryList`:** saved entries (#, applied date, created, supplier, description, total). Each row expands to show its lines and totals.

Gotchas found:
- MUI v9 icons are named `DeleteOutlined` and `ErrorOutlined`; there is no `…Outline` variant.
- `react-hooks/set-state-in-effect` rejects calling a loader from an effect when it sets state synchronously. Only set state in the promise callbacks.
- With `tableLayout: fixed`, a `padding="checkbox"` cell ignored its width and got squeezed, so a plain cell is used instead.
- Vite listens on `localhost`/IPv6 only, so use `http://localhost:5173`, not `127.0.0.1:5173`.

## Verification
- `makemigrations --check` reports no changes. The migration was applied, and the 17 tests pass on Postgres.
- API through the proxy: 19 postable accounts are returned. Unbalanced entries and lines with both sides get a 400 with clear messages, and nothing is saved.
- Browser (playwright-cli):
  - debit/credit locking works in both directions;
  - an unbalanced entry shows "Difference: $ 10.000" and Save is disabled;
  - a balanced entry saves as #0001, the snackbar appears, the form resets, and the list row expands to show its lines;
  - a mocked server error shows as "Line 2: …";
  - Chat/Ledger navigation works;
  - there is no horizontal overflow at 390px wide, and dark mode is OK.
- Postgres has entry `0001` (5125-01 debit 50,000 / 2105-02 credit 50,000), created during the browser test.

## Notes / next
- `TIME_ZONE` is `UTC`, so if a client omits `applied_date`, the server's default date is the UTC date. The UI always sends the local date. Consider setting `TIME_ZONE` to the users' zone.
- Possible next steps: edit or void entries, filters and pagination, real auth.
