# Step 06 — Dashboard page (home)

Status: **done** (2026-10-24)

## Context
Users could record entries but had no overview of their money. The Dashboard summarizes the ledger and is now the home page. The user chose:
- **key figures**: net worth, income, expenses, net;
- an **income vs expenses chart** covering 6 months;
- a **month selector**;
- **`/dashboard` as home**.

## Accounting definitions
All figures are per user, computed from `LedgerEntry` and the account's `account_type`, and filtered by `Transaction.applied_date`, not `created_at`:
| Figure | Calculation | Window |
|---|---|---|
| Income | Σ(credit − debit) on INCOME accounts | the selected month |
| Expenses | Σ(debit − credit) on EXPENSE accounts | the selected month |
| Net | income − expenses | the selected month |
| Assets | Σ(debit − credit) on ASSET accounts | balance as of the month's last day |
| Liabilities | Σ(credit − debit) on LIABILITY accounts | balance as of the month's last day |
| Net worth | assets − liabilities | balance as of the month's last day |

Paying a credit card from the bank moves the balances but is not an expense.

## Backend (`finco_ai/dashboard/`)
- **`services.build_summary(user_id, year, month)`** uses aggregated ORM queries: conditional `Sum(Case(When…))` per figure, and one `TruncMonth` grouped query for the 6-month trend (zero-filled, crossing year boundaries). It returns decimal strings, plus the previous month's income and expenses.
- **`GET /api/dashboard/summary/?month=YYYY-MM`** (`views.DashboardSummaryView`): `month` is validated (400 if bad) and defaults to the current month. It is scoped by `get_user_id` and requires Firebase auth.
- **11 tests:**
  - zeros for a new user;
  - month and previous-month figures;
  - net worth as of the month's end;
  - a card payment not counted as an expense;
  - 6-month trend order and gaps, including across a year boundary;
  - `applied_date` versus `created_at`;
  - user isolation;
  - defaulting to the current month;
  - invalid month (400) and no token (401).

## Frontend
- **Dependency:** `@mui/x-charts` 9.16 (`BarChart`).
- **Shared helpers:** `money.ts` and `dates.ts` moved from `features/ledger/` to `src/lib/`.
  - `apiToCents` parses signed API amounts (`toCents` is for user input and rejects `-`).
  - `formatCompact` gives axis labels like "$3 M".
  - `money.test.ts` covers both.
- **`src/features/dashboard/`:**
  - `dashboardService.ts`, plus `useDashboard(month)`, which ignores stale responses and keeps the previous data dimmed while the next month loads.
  - `months.ts`: month keys and English month names; tested in `months.test.ts`.
  - **`MonthSelector`**: ‹ October 2026 ›, with "next" disabled at the current month.
  - **`KeyFigures`**: four white cards with large tabular amounts.
    - Net worth has an "As of Oct 31, 2026" caption; Income and Expenses show "vs September: ±N%" (hidden when the previous value is 0).
    - Net worth and Net turn `danger` when negative.
    - Layout: 4 columns at `lg`, 2 at `sm`, 1 on phones.
  - **`IncomeExpenseChart`**: bars in brand 400 (income) and 700 (expenses), compact y-axis, short month ticks, and full months in the tooltip.
  - **Empty state** (no activity, current month): a tinted card with "No movements yet" and a "Go to Ledger" link.
- **Routing:** `/`, `*` and the post-login default all go to `/dashboard`. Dashboard is the first nav tab.

Deviation from the plan: dimming the non-selected months in the chart was dropped. MUI X's per-bar color maps act on the axis and would override both series' colors, and the month selector already marks the current month.

## Verification
- Backend: 56 tests pass (11 new), and `makemigrations --check` is clean.
- Frontend: build, lint, and 34 Vitest tests pass.
- Browser (playwright-cli, throwaway account deleted afterwards):
  - Sign-up lands on `/dashboard` with the empty state.
  - Entries added through the Ledger: salary 3,000,000 (Oct), lunch 50,000 (Oct), lunch 80,000 (Sep).
  - October: net worth $2.870.000, income $3.000.000, expenses $50.000 ("vs September: −37%"), net $2.950.000.
  - September: net worth and net are both −$80.000, in danger color.
  - The chart bars land in the right months.
  - "Next" is disabled on the current month.
  - The chart and cards follow the Appearance color (checked with Clay).
  - There is no overflow at 390px.
