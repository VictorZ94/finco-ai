import Typography from '@mui/material/Typography'
import { useIncomeStatement } from '../../hooks/reports/useReports.ts'
import ReportCard from './components/ReportCard.tsx'
import StatementTable, { StatementLine, StatementTree } from './components/StatementTable.tsx'
import { formatPeriod } from './periods.ts'
import { incomeStatementCsv, summaryLines } from './reportRows.ts'
import { usePeriod } from './usePeriod.ts'

/** Estado de resultados: Ingresos (4) and Gastos (5) for the period, then the subtotals down to net income. */
export default function IncomeStatementPage() {
  const { period } = usePeriod()
  const query = useIncomeStatement(period)

  return (
    <ReportCard
      title="Income statement"
      subtitle={formatPeriod(period)}
      query={query}
      csv={(data) => ({ filename: `income-statement_${data.from}_${data.to}.csv`, rows: incomeStatementCsv(data) })}
    >
      {(data) =>
        !data.income && !data.expenses ? (
          <Typography color="text.secondary">No income or expenses in this period.</Typography>
        ) : (
          <StatementTable label="Income statement">
            <StatementTree node={data.income} />
            <StatementTree node={data.expenses} />
            {summaryLines(data.summary).map((line) => (
              <StatementLine
                key={line.key}
                label={line.label}
                amount={line.amount}
                total={line.total}
                grand={line.key === 'net_income'}
              />
            ))}
          </StatementTable>
        )
      }
    </ReportCard>
  )
}
