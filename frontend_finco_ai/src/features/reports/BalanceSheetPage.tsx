import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useBalanceSheet } from '../../hooks/reports/useReports.ts'
import { formatIsoDate } from '../../lib/dates.ts'
import { apiToCents, formatCents } from '../../lib/money.ts'
import { danger } from '../../theme/tokens.ts'
import ReportCard from './components/ReportCard.tsx'
import StatementTable, { StatementLine, StatementTree } from './components/StatementTable.tsx'
import { balanceSheetCsv } from './reportRows.ts'
import { usePeriod } from './usePeriod.ts'

/** Estado de situación financiera at the period's end: Activo | Pasivo + Patrimonio. */
export default function BalanceSheetPage() {
  const { period } = usePeriod()
  const query = useBalanceSheet(period.to)

  return (
    <ReportCard
      title="Balance sheet"
      subtitle={`As of ${formatIsoDate(period.to)}`}
      query={query}
      csv={(data) => ({ filename: `balance-sheet_${data.as_of}.csv`, rows: balanceSheetCsv(data) })}
    >
      {(data) => (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 3, md: 4 },
              alignItems: 'start',
              '@media print': { gridTemplateColumns: '1fr 1fr' },
            }}
          >
            <StatementTable label="Assets">
              <StatementTree node={data.assets} />
              <StatementLine label="Total assets" amount={data.total_assets} total grand />
            </StatementTable>
            <StatementTable label="Liabilities and equity">
              <StatementTree node={data.liabilities} />
              <StatementLine label="Total liabilities" amount={data.total_liabilities} total />
              <StatementTree node={data.equity} />
              <StatementLine label="Prior years’ results" amount={data.prior_results} />
              <StatementLine label="Result for the year" amount={data.current_result} />
              <StatementLine label="Total equity" amount={data.total_equity} total />
              <StatementLine label="Total liabilities and equity" amount={data.total_liabilities_and_equity} total grand />
            </StatementTable>
          </Box>
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {data.balanced ? (
              <Chip label="Balanced" color="primary" variant="outlined" size="small" />
            ) : (
              <Chip
                label={`Difference ${formatCents(apiToCents(data.difference))}`}
                size="small"
                sx={{ color: danger.main, bgcolor: danger.surface }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              The result for the year is Ingresos − Gastos since January 1; there are no closing entries yet.
            </Typography>
          </Box>
        </>
      )}
    </ReportCard>
  )
}
