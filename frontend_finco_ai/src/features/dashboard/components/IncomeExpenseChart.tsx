import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { BarChart } from '@mui/x-charts/BarChart'
import { apiToCents, formatCents, formatCompact } from '../../../lib/money.ts'
import { cardSx } from '../../../theme/index.ts'
import { useBrand } from '../../../theme/useBrand.ts'
import { formatMonthLong, formatMonthShort } from '../months.ts'
import type { DashboardSummary } from '../types.ts'

/** Income vs expenses for the 6 months ending at the selected one, in two shades of the brand. */
export default function IncomeExpenseChart({ summary }: { summary: DashboardSummary }) {
  const brand = useBrand()
  // Values in pesos for the chart scale; formatters convert back to cents for display.
  const dataset = summary.trend.map((point) => ({
    month: point.month,
    income: apiToCents(point.income) / 100,
    expenses: apiToCents(point.expenses) / 100,
  }))
  const money = (value: number | null) => (value == null ? '' : formatCents(Math.round(value * 100)))

  return (
    <Box component="section" aria-labelledby="trend-title" sx={{ ...cardSx(brand), p: { xs: 2.5, sm: 3 } }}>
      <Typography id="trend-title" variant="h3" component="h2">
        Income vs expenses
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Last 6 months
      </Typography>
      <BarChart
        dataset={dataset}
        height={300}
        borderRadius={6}
        margin={{ left: 8, right: 8, top: 16, bottom: 8 }}
        xAxis={[
          {
            dataKey: 'month',
            scaleType: 'band',
            disableTicks: true,
            categoryGapRatio: 0.35,
            barGapRatio: 0.15,
            valueFormatter: (value: string, context) =>
              context.location === 'tick' ? formatMonthShort(value) : formatMonthLong(value),
          },
        ]}
        yAxis={[
          {
            disableLine: true,
            disableTicks: true,
            width: 64,
            valueFormatter: (value: number) => formatCompact(Math.round(value * 100)),
          },
        ]}
        series={[
          { dataKey: 'income', label: 'Income', color: brand[400], valueFormatter: money },
          { dataKey: 'expenses', label: 'Expenses', color: brand[700], valueFormatter: money },
        ]}
        grid={{ horizontal: true }}
        sx={{
          '& .MuiChartsGrid-line': { stroke: brand[100] },
          '& .MuiChartsAxis-tickLabel': { fill: brand[600] },
        }}
      />
    </Box>
  )
}
