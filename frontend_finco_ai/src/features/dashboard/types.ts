/** GET /api/dashboard/summary/ — amounts are decimal strings. */
export interface DashboardSummary {
  month: string // YYYY-MM
  income: string
  expenses: string
  net: string
  previous: { month: string; income: string; expenses: string }
  assets: string
  liabilities: string
  net_worth: string
  trend: { month: string; income: string; expenses: string }[]
}
