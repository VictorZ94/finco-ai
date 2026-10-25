import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EntryForm from './components/EntryForm.tsx'
import EntryList from './components/EntryList.tsx'
import { revealSx } from '../../theme/motion.ts'
import { useAccounts, useTransactions } from './useLedgerQueries.ts'

export default function LedgerPage() {
  // Both requests start together.
  const accounts = useAccounts()
  const transactions = useTransactions()
  const loadError = accounts.error ?? transactions.error

  function reload() {
    if (accounts.isError) void accounts.refetch()
    if (transactions.isError) void transactions.refetch()
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Box sx={revealSx(0)}>
            <Typography variant="h2" component="h1" sx={{ mb: 0.75 }}>
              Ledger
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: '62ch' }}>
              Register a movement as a balanced entry: total debits must equal total credits.
            </Typography>
          </Box>

          {loadError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={reload}>
                  Retry
                </Button>
              }
            >
              {loadError.messages.join(' ')}
            </Alert>
          ) : !accounts.data || !transactions.data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress aria-label="Loading ledger" />
            </Box>
          ) : (
            <>
              {accounts.data.length === 0 && (
                <Alert severity="warning">
                  There are no accounts that can receive movements. Load the chart of accounts first.
                </Alert>
              )}
              <Box sx={revealSx(1)}>
                <EntryForm accounts={accounts.data} />
              </Box>
              <Box sx={revealSx(2)}>
                <EntryList entries={transactions.data} />
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
