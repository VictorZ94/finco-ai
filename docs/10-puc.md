# Step 10 — PUC page (chart of accounts with rolled-up balances)

## Goal
A `/puc` page showing the user's chart of accounts the way the Colombian PUC works:
Clase (`1` Activo) → Grupo (`11` Disponible) → Cuenta (`1110` Bancos) → Subcuenta (`111010` Bancolombia).
Only the 6-digit subcuenta receives movements (ledger and chat). Every higher level shows the **sum of its children**.

Decisions:
- Codes are **pure 6 digits** like the official PUC (`1110-10` → `111010`).
- Each row shows the **cumulative balance at the selected month's last day**, signed by the account's nature
  (DEBIT: debit − credit; CREDIT: credit − debit). Month selector like the dashboard.
- **Expandable tree table** with a "Hide zero balances" switch and Expand all / Collapse all.

## Backend
- `financial_accounts/migrations/0003_six_digit_codes.py`: data migration that drops the dash from every code
  (reversible). The fixture template now uses 6-digit codes.
- `financial_accounts/services.child_code(parent, siblings)`: next `parent + NN` (`5135` with `513501..03` → `513504`);
  raises `ValueError` past 99. `ai_chat.context` stores `None` for a full group and `rules.check_proposal` refuses it.
- `financial_accounts/balances.build_chart_balances(user_id, year, month)`: one grouped ORM query of debit/credit per
  account up to the month's end, then a bottom-up pass over the accounts (level 4 → 1) adding raw debits/credits into
  each parent. Rolling up raw sides (not signed balances) keeps parents right even with contra-nature children.
- `GET /api/accounts/balances/?month=YYYY-MM` (`ChartBalancesView`) → `{month, as_of, accounts: [...]}`, each account
  with `id, code, name, level, nature, account_type, parent_id, can_receive_movement, debit, credit, balance`.
- `finco_ai/months.month_param(request)` parses `?month` for both this view and the dashboard.

## Frontend
- `hooks/accounts/useChartBalances.ts` (`accountKeys`: `all`, `balancesAll`, `balances(month)`).
- `features/puc/`: `PucPage`, `components/AccountTree`, `buildTree.ts` (+ tests), `types.ts`.
- Route `/puc` and nav item "PUC" (`AccountTreeOutlined`).
- Ledger saves and chat turns that save an entry invalidate `accountKeys.balancesAll`; accepting a new-account
  proposal invalidates `accountKeys.all`.

## Results
- Backend: 96 tests pass (new: `financial_accounts/tests.py` — child codes, 6-digit default chart, roll-up at every
  level, CREDIT signing, month cut-off, ownership, 400 on bad month, 401; chat rule for a full group).
- Frontend: build, lint and 60 Vitest tests pass (new `buildTree.test.ts`).
- Browser (test user with 5 seeded entries): Bancolombia 2.820.000 + Nubank 200.000 = Bancos 3.020.000;
  + Caja 100.000 = Disponible 3.120.000 = Activo. September shows only the September entry. "Hide zero balances" keeps
  just the paths to non-zero accounts. At 390 px there is no horizontal scroll; the code sits above a wrapping name.
