import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import type { ReactNode } from 'react'
import type { ApiError } from '../../../lib/apiClient.ts'
import { downloadCsv, type CsvCell } from '../../../lib/csv.ts'
import { useAuth } from '../../auth/useAuth.ts'
import { cardSx } from '../../../theme/index.ts'
import { revealSx } from '../../../theme/motion.ts'
import { useBrand } from '../../../theme/useBrand.ts'

interface ReportCardProps<T> {
  title: string
  /** The period or cut-off, shown under the title (also on paper). */
  subtitle: string
  query: { data: T | undefined; error: ApiError | null; isPlaceholderData: boolean; refetch: () => unknown }
  /** CSV rows and file name for the current data. */
  csv: (data: T) => { filename: string; rows: CsvCell[][] }
  children: (data: T) => ReactNode
}

/** A report's white card: title, CSV / print actions, loading and error states. */
export default function ReportCard<T>({ title, subtitle, query, csv, children }: ReportCardProps<T>) {
  const brand = useBrand()
  const { user } = useAuth()
  const { data, error, isPlaceholderData, refetch } = query

  return (
    <Box
      component="section"
      aria-labelledby="report-title"
      sx={{
        ...cardSx(brand),
        p: { xs: 2, sm: 4 },
        ...revealSx(1),
        '@media print': { border: 'none', borderRadius: 0, boxShadow: 'none', p: 0, animation: 'none' },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 3 }}
      >
        <Box>
          <Typography
            sx={{ display: 'none', displayPrint: 'block', color: 'text.secondary', fontSize: '0.8125rem', mb: 0.5 }}
          >
            FincoAI{user?.displayName ? ` · ${user.displayName}` : ''}
          </Typography>
          <Typography id="report-title" variant="h3" component="h2">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ displayPrint: 'none', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={!data}
            onClick={() => {
              if (!data) return
              const { filename, rows } = csv(data)
              downloadCsv(filename, rows)
            }}
          >
            CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<PrintIcon />} disabled={!data} onClick={() => window.print()}>
            Print / PDF
          </Button>
        </Stack>
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
          <CircularProgress aria-label={`Loading ${title.toLowerCase()}`} />
        </Box>
      ) : (
        // Dim while another period loads, instead of swapping in a spinner.
        <Box aria-busy={isPlaceholderData} sx={{ opacity: isPlaceholderData ? 0.55 : 1, transition: 'opacity 150ms' }}>
          {children(data)}
        </Box>
      )}
    </Box>
  )
}
