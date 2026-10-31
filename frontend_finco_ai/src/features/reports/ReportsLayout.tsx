import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, Outlet, useLocation } from 'react-router'
import { revealSx } from '../../theme/motion.ts'
import PeriodBar from './components/PeriodBar.tsx'
import { usePeriod } from './usePeriod.ts'

const REPORTS = [
  { path: 'income-statement', label: 'Income statement' },
  { path: 'balance-sheet', label: 'Balance sheet' },
  { path: 'journal', label: 'Journal' },
  { path: 'general-ledger', label: 'General ledger' },
] as const

/** /reports: title, report tabs and the shared period; each report renders in the Outlet. */
export default function ReportsLayout() {
  const { pathname, search } = useLocation()
  const { period, setPeriod } = usePeriod()
  const current = REPORTS.find((report) => pathname.endsWith(`/${report.path}`))?.path ?? false

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: 'auto',
        '@media print': { overflow: 'visible', height: 'auto' },
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 }, '@media print': { p: 0, maxWidth: 'none' } }}>
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
          <Box sx={{ displayPrint: 'none', ...revealSx(0) }}>
            <Typography variant="h2" component="h1" sx={{ mb: 0.75 }}>
              Reports
            </Typography>
            <Typography color="text.secondary">Financial statements and books for the period you choose.</Typography>
          </Box>
          <Tabs
            value={current}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Reports"
            sx={{ displayPrint: 'none', borderBottom: 1, borderColor: 'brand.200', minHeight: 44 }}
          >
            {REPORTS.map((report) => (
              <Tab
                key={report.path}
                value={report.path}
                label={report.label}
                component={RouterLink}
                // Keep ?from=&to= (and the ledger's account) when switching reports.
                to={{ pathname: report.path, search }}
                sx={{ minHeight: 44 }}
              />
            ))}
          </Tabs>
          <PeriodBar period={period} onChange={setPeriod} asOf={current === 'balance-sheet'} />
          <Outlet />
        </Stack>
      </Container>
    </Box>
  )
}
