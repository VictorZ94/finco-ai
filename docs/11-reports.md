# Step 11 — Reports: financial statements and books

## Goal
A `/reports` route with the statements the books can produce:
1. **Income statement** (Estado de resultados) for a period.
2. **Balance sheet** (Estado de situación financiera) at a cut-off date.
3. **General journal** (Libro diario): every entry of the period with its lines.
4. **General ledger** (Libro mayor): per account, opening balance, movements with a running balance, closing balance.

Decisions: the period is chosen with **From/To dates plus presets** (This month, Last month, This year, Last year),
and the balance sheet uses *To* as its cut-off. Reports export as **CSV for Excel** and **Print / Save as PDF**.

## Backend — `reports` app (no models)
- `financial_accounts/balances.py`: `account_totals(user_id, start=, end=)` runs one grouped query over the range, then
  adds each account's raw debits and credits into its parent, level by level. `signed()` and `money()` are shared
  helpers. The PUC endpoint (`build_chart_balances`) now uses it too.
- `finco_ai/months.py`: `date_param(request, name, default)` and `date_range_param(request)`: `?from=&to=`
  (`YYYY-MM-DD`). The default is the first of the month to today; invalid or reversed dates get a 400.
- `reports/services.py`:
  - `income_statement`: the 4 and 5 trees (zero branches dropped) and a summary. Operating income is 41, operating
    expenses are 51 + 52, and income tax is 54. The rest of 4 and 5 is non-operating, so net income = 4 − 5.
  - `balance_sheet`: the 1/2/3 trees as of the date. There are no closing entries, so equity gets **Result for the
    year** (4 − 5 since January 1) and **Prior years' results** (4 − 5 before it). It returns totals, `balanced` and
    `difference`.
  - `journal`: entries ordered by `applied_date, numbering` (`TransactionSerializer`), with period totals.
  - `general_ledger`: postable accounts that have an opening balance or movements. The opening balance is an
    aggregate before `from`; the running balance is a SQL `Window(Sum(signed amount))` per account; a closing balance
    follows. `?account=<id>` limits it to one of the user's accounts.
- Endpoints: `GET /api/reports/income-statement/`, `/balance-sheet/?as_of`, `/journal/`, `/general-ledger/`.

## Frontend — `/reports`
- `ReportsLayout`: the title, report tabs (`Tabs` + `RouterLink`, which keep the query string), `PeriodBar` and an
  `<Outlet/>`. Child routes are `income-statement` (the index redirects there and keeps the query), `balance-sheet`,
  `journal` and `general-ledger`. A "Reports" nav item (`AssessmentOutlined`) was added.
- The period lives in the URL via `usePeriod()`. `periods.ts` (tested) holds the presets, `readPeriod` and
  `changePeriod`.
- `hooks/reports/useReports.ts` (`reportKeys`, `keepPreviousData`). Saving an entry in the ledger or in chat
  invalidates `reportKeys.all`.
- Components:
  - `ReportCard` wraps each page: title, CSV and Print / PDF buttons, loading and error states, dimming while
    `isPlaceholderData`, and a print-only "FincoAI · <name>" line.
  - `StatementTable` / `StatementTree` / `StatementLine` draw indented PUC rows and bold subtotals.
  - `Amount` formats amounts; negatives show in `danger`.
- Journal: an entry header (number, date, supplier · description), then its lines, with credit lines indented as in
  a handwritten journal, and totals at the end.
- General ledger: an account picker (all, or one postable account) and one table per account. On phones the table
  scrolls inside the card.
- **CSV** (`lib/csv.ts`, tested): `;` separator, comma decimals and a UTF-8 BOM. Row builders are in
  `features/reports/reportRows.ts` (tested).
- **Print**: `window.print()`. The AppBar, tabs, period bar and buttons use `displayPrint: 'none'`. `AppLayout` and
  `ReportsLayout` drop their fixed height and overflow under `@media print`, so long reports print in full.

## Results
- Backend: 106 tests pass (10 new in `reports/tests.py`: subtotals, date filter, empty period, 400s, balance sheet
  across a year boundary, journal order and totals, ledger opening/running/closing, account filter, another user's
  account, 401).
- Frontend: build, lint and 77 Vitest tests pass (new: `periods`, `csv`, `reportRows`).
- Browser, with a test user who had 6 entries across December 2025 and October 2026:
  - Income statement for Oct 2026: income 3.000.000 − expenses 130.000 = net income 2.870.000.
  - Balance sheet at 31 Oct 2026: assets 4.420.000 = liabilities 50.000 + equity 4.370.000 (capital 1.000.000 +
    prior years' 500.000 + result for the year 2.870.000). Marked Balanced.
  - Journal: 4 entries in date order; totals 3.230.000 / 3.230.000.
  - Ledger for Bancolombia: opening 1.500.000 → 4.500.000 → 4.400.000 → closing 4.320.000, the same as the PUC.
  - The period stays when you switch tabs, and presets update the URL.
  - The CSV downloads as `general-ledger_<from>_<to>.csv` with `;` separators and comma decimals.
  - Print preview hides the app chrome. At 390 px there is no horizontal page scroll.
