import type { FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableFooter from '@mui/material/TableFooter'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import SaveIcon from '@mui/icons-material/Save'
import { formatDateTime } from '../dates.ts'
import { formatCents, isValidAmount } from '../money.ts'
import type { Account, LedgerLine } from '../types.ts'
import type { LedgerForm } from '../useLedgerForm.ts'
import { useNow } from '../useNow.ts'
import { cardSx } from '../../../theme/index.ts'
import { danger } from '../../../theme/tokens.ts'
import { useBrand } from '../../../theme/useBrand.ts'

interface EntryFormProps {
  form: LedgerForm
  accounts: Account[]
  isSaving: boolean
  errors: string[] | null
  onDismissErrors: () => void
  onSubmit: () => void
}

function accountLabel(account: Account) {
  return `${account.code} · ${account.name}`
}

interface AmountFieldProps {
  ariaLabel: string
  label?: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}

function AmountField({ ariaLabel, label, value, disabled, onChange }: AmountFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder="0"
      size="small"
      fullWidth
      // Let amount inputs shrink inside the phone layout's two-column row.
      sx={{ minWidth: 0 }}
      error={!isValidAmount(value)}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        htmlInput: {
          inputMode: 'decimal',
          'aria-label': ariaLabel,
          style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
        },
      }}
    />
  )
}

interface LineProps {
  line: LedgerLine
  index: number
  accounts: Account[]
  form: LedgerForm
}

function AccountField({ line, accounts, form }: Omit<LineProps, 'index'>) {
  return (
    <Autocomplete
      options={accounts}
      value={line.account}
      onChange={(_, account) => form.updateLine(line.key, { account })}
      getOptionLabel={accountLabel}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props
        return (
          <li key={key} {...optionProps}>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1.25, minWidth: '7ch', fontVariantNumeric: 'tabular-nums' }}>
              {option.code}
            </Box>
            {option.name}
          </li>
        )
      }}
      size="small"
      fullWidth
      renderInput={(params) => <TextField {...params} placeholder="Choose an account" />}
    />
  )
}

function RemoveLineButton({ line, index, form }: Omit<LineProps, 'accounts'>) {
  return (
    <Tooltip title={form.canRemoveLine ? 'Remove line' : 'An entry needs at least 2 lines'}>
      <span>
        <IconButton
          aria-label={`Remove line ${index + 1}`}
          onClick={() => form.removeLine(line.key)}
          disabled={!form.canRemoveLine}
          size="small"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  )
}

/** Debit XOR credit: a side is locked while the other one has a value. */
function amountFields(line: LedgerLine, index: number, form: LedgerForm, withLabels: boolean) {
  return {
    debit: (
      <AmountField
        ariaLabel={`Line ${index + 1} debit`}
        label={withLabels ? 'Debit' : undefined}
        value={line.debit}
        disabled={line.credit.trim() !== ''}
        onChange={(debit) => form.updateLine(line.key, { debit })}
      />
    ),
    credit: (
      <AmountField
        ariaLabel={`Line ${index + 1} credit`}
        label={withLabels ? 'Credit' : undefined}
        value={line.credit}
        disabled={line.debit.trim() !== ''}
        onChange={(credit) => form.updateLine(line.key, { credit })}
      />
    ),
  }
}

function TotalAmount({ cents, testId }: { cents: number; testId: string }) {
  return (
    <Typography component="span" variant="money" data-testid={testId} sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
      {formatCents(cents)}
    </Typography>
  )
}

function LinesTable({ form, accounts }: { form: LedgerForm; accounts: Account[] }) {
  return (
    <TableContainer sx={{ mb: 2 }}>
      <Table size="small" aria-label="Entry lines" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell>Account</TableCell>
            <TableCell align="right" sx={{ width: '22%' }}>
              Debit
            </TableCell>
            <TableCell align="right" sx={{ width: '22%' }}>
              Credit
            </TableCell>
            <TableCell sx={{ width: 56, px: 1 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {form.lines.map((line, index) => {
            const amounts = amountFields(line, index, form, false)
            return (
              <TableRow key={line.key}>
                <TableCell>
                  <AccountField line={line} accounts={accounts} form={form} />
                </TableCell>
                <TableCell>{amounts.debit}</TableCell>
                <TableCell>{amounts.credit}</TableCell>
                <TableCell align="center" sx={{ px: 1 }}>
                  <RemoveLineButton line={line} index={index} form={form} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} sx={{ borderBottom: 'none', py: 1.5 }}>
              <Button startIcon={<AddIcon />} onClick={form.addLine} size="small">
                Add line
              </Button>
            </TableCell>
          </TableRow>
          <TableRow
            sx={{ '& td': { borderBottom: 'none', borderTop: '1px solid', borderTopColor: 'brand.950', color: 'text.primary', py: 2 } }}
          >
            <TableCell>
              <Typography variant="h6" component="span">
                Total
              </Typography>
            </TableCell>
            <TableCell align="right">
              <TotalAmount cents={form.totalDebit} testId="total-debit" />
            </TableCell>
            <TableCell align="right">
              <TotalAmount cents={form.totalCredit} testId="total-credit" />
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  )
}

/** Phone layout: each line is a small card with labeled amounts. */
function LinesStacked({ form, accounts }: { form: LedgerForm; accounts: Account[] }) {
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }} aria-label="Entry lines">
      {form.lines.map((line, index) => {
        const amounts = amountFields(line, index, form, true)
        return (
          <Paper key={line.key} variant="outlined" sx={{ p: 1.5, bgcolor: 'brand.50', borderRadius: '16px' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Line {index + 1}
              </Typography>
              <RemoveLineButton line={line} index={index} form={form} />
            </Stack>
            <Stack spacing={1.5}>
              <AccountField line={line} accounts={accounts} form={form} />
              <Stack direction="row" spacing={1}>
                {amounts.debit}
                {amounts.credit}
              </Stack>
            </Stack>
          </Paper>
        )
      })}
      <Box>
        <Button startIcon={<AddIcon />} onClick={form.addLine} size="small">
          Add line
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 2,
          rowGap: 1,
          alignItems: 'baseline',
          borderTop: '1px solid',
          borderTopColor: 'brand.950',
          pt: 1.5,
          '& > :nth-child(even)': { justifySelf: 'end' },
        }}
      >
        <Typography color="text.secondary">Total debit</Typography>
        <TotalAmount cents={form.totalDebit} testId="total-debit" />
        <Typography color="text.secondary">Total credit</Typography>
        <TotalAmount cents={form.totalCredit} testId="total-credit" />
      </Box>
    </Stack>
  )
}

function BalanceChip({ form }: { form: LedgerForm }) {
  if (form.isBalanced) {
    return <Chip icon={<CheckIcon />} label="Balanced" sx={{ '& .MuiChip-icon': { color: 'brand.900' } }} />
  }
  if (form.totalDebit + form.totalCredit === 0) {
    return <Chip label="No amounts yet" variant="outlined" />
  }
  return (
    <Chip
      icon={<ErrorOutlineIcon />}
      label={
        <>
          Difference{' '}
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCents(Math.abs(form.difference))}
          </Box>
        </>
      }
      sx={{ bgcolor: danger.surface, color: danger.main, '& .MuiChip-icon': { color: danger.main } }}
    />
  )
}

export default function EntryForm({
  form,
  accounts,
  isSaving,
  errors,
  onDismissErrors,
  onSubmit,
}: EntryFormProps) {
  const now = useNow()
  const brand = useBrand()
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.canSave && !isSaving) onSubmit()
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ ...cardSx(brand), p: { xs: 2.5, sm: 4 } }}>
      <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
        New entry
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 2fr' },
          mb: 3,
        }}
      >
        <TextField
          label="Current date"
          value={formatDateTime(now)}
          disabled
          helperText="Set automatically"
          size="small"
        />
        <TextField
          label="Applied date"
          type="date"
          value={form.appliedDate}
          onChange={(event) => form.setAppliedDate(event.target.value)}
          required
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Supplier"
          value={form.supplier}
          onChange={(event) => form.setSupplier(event.target.value)}
          placeholder="Person or company (optional)"
          size="small"
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(event) => form.setDescription(event.target.value)}
          placeholder="What was this movement? (optional)"
          size="small"
          sx={{ gridColumn: '1 / -1' }}
        />
      </Box>

      {isCompact ? (
        <LinesStacked form={form} accounts={accounts} />
      ) : (
        <LinesTable form={form} accounts={accounts} />
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <BalanceChip form={form} />
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end' }}
        >
          {!form.canSave && (
            <Typography variant="body2" color="text.secondary">
              {form.problems[0]}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!form.canSave}
            loading={isSaving}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Save entry
          </Button>
        </Stack>
      </Stack>

      {errors && (
        <Alert severity="error" onClose={onDismissErrors} sx={{ mt: 2 }}>
          {errors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </Alert>
      )}
    </Box>
  )
}
