import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EntryForm from './components/EntryForm.tsx'
import EntryList from './components/EntryList.tsx'
import { useLedgerData } from './useLedgerData.ts'
import { useLedgerForm } from './useLedgerForm.ts'

export default function LedgerPage() {
  const { accounts, transactions, isLoading, loadError, reload, save } = useLedgerData()
  const form = useLedgerForm()
  const [isSaving, setIsSaving] = useState(false)
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null)
  const [savedNumber, setSavedNumber] = useState<string | null>(null)

  async function handleSubmit() {
    setIsSaving(true)
    setSaveErrors(null)
    try {
      const created = await save(form.toPayload())
      setSavedNumber(created.numbering)
      form.reset()
    } catch (messages) {
      setSaveErrors(messages as string[])
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Ledger
            </Typography>
            <Typography color="text.secondary">
              Register a movement as a balanced entry: total debits must equal total credits.
            </Typography>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress aria-label="Loading ledger" />
            </Box>
          ) : loadError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={reload}>
                  Retry
                </Button>
              }
            >
              {loadError.join(' ')}
            </Alert>
          ) : (
            <>
              {accounts.length === 0 && (
                <Alert severity="warning">
                  There are no accounts that can receive movements. Load the chart of accounts first.
                </Alert>
              )}
              <EntryForm
                form={form}
                accounts={accounts}
                isSaving={isSaving}
                errors={saveErrors}
                onDismissErrors={() => setSaveErrors(null)}
                onSubmit={() => void handleSubmit()}
              />
              <EntryList entries={transactions} />
            </>
          )}
        </Stack>
      </Container>

      <Snackbar
        open={savedNumber !== null}
        autoHideDuration={4000}
        onClose={() => setSavedNumber(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSavedNumber(null)}>
          Entry #{savedNumber} saved
        </Alert>
      </Snackbar>
    </Box>
  )
}
