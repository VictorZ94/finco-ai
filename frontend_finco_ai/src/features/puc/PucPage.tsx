import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import { useState } from 'react'
import { useChartBalances } from '../../hooks/accounts/useChartBalances.ts'
import { formatIsoDate } from '../../lib/dates.ts'
import { cardSx } from '../../theme/index.ts'
import { revealSx } from '../../theme/motion.ts'
import { useBrand } from '../../theme/useBrand.ts'
import MonthSelector from '../dashboard/components/MonthSelector.tsx'
import { currentMonth } from '../dashboard/months.ts'
import { buildTree, visibleRows, type ExpandMode } from './buildTree.ts'
import AccountTree from './components/AccountTree.tsx'

export default function PucPage() {
  const brand = useBrand()
  const [month, setMonth] = useState(currentMonth)
  const [hideZero, setHideZero] = useState(false)
  const [mode, setMode] = useState<ExpandMode>('default')
  // Rows the user opened or closed, relative to the mode's default.
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set())
  const { data, error, isPlaceholderData, refetch } = useChartBalances(month)

  const rows = data ? visibleRows(buildTree(data.accounts, hideZero), mode, toggled) : []

  const toggle = (id: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const expandAll = (next: ExpandMode) => {
    setMode(next)
    setToggled(new Set())
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, ...revealSx(0) }}
          >
            <Box>
              <Typography variant="h2" component="h1" sx={{ mb: 0.75 }}>
                Chart of accounts
              </Typography>
              <Typography color="text.secondary">
                Your PUC, with each account adding up the ones below it.
              </Typography>
            </Box>
            <MonthSelector month={month} onChange={setMonth} />
          </Stack>

          {error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            >
              {error.messages.join(' ')}
            </Alert>
          ) : !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress aria-label="Loading chart of accounts" />
            </Box>
          ) : (
            <Box
              component="section"
              aria-busy={isPlaceholderData}
              sx={{
                ...cardSx(brand),
                p: { xs: 1.5, sm: 3 },
                opacity: isPlaceholderData ? 0.55 : 1,
                transition: 'opacity 150ms',
                ...revealSx(1),
              }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 1, pb: 1.5 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Balances as of {formatIsoDate(data.as_of)}
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={hideZero} onChange={(_, checked) => setHideZero(checked)} />}
                    label="Hide zero balances"
                    slotProps={{ typography: { variant: 'body2' } }}
                    sx={{ mr: 0.5 }}
                  />
                  <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={() => expandAll('all')}>
                    Expand all
                  </Button>
                  <Button size="small" startIcon={<UnfoldLessIcon />} onClick={() => expandAll('none')}>
                    Collapse all
                  </Button>
                </Stack>
              </Stack>
              {rows.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 1, py: 3 }}>
                  No balances this month. Turn off “Hide zero balances” to see every account.
                </Typography>
              ) : (
                <AccountTree rows={rows} onToggle={toggle} />
              )}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
