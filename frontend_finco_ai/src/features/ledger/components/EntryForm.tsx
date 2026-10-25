import { useState } from 'react'
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
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
import FormTextField from '../../../components/FormTextField.tsx'
import { formatDateTime } from '../../../lib/dates.ts'
import { formatCents, isValidAmount, toCents } from '../../../lib/money.ts'
import { cardSx } from '../../../theme/index.ts'
import { danger } from '../../../theme/tokens.ts'
import { useBrand } from '../../../theme/useBrand.ts'
import { emptyEntry, emptyLine, entryTotals, firstProblem, type EntryFormValues } from '../entrySchema.ts'
import type { Account, NewTransaction } from '../types.ts'
import { useEntryForm } from '../useEntryForm.ts'
import { useCreateTransaction } from '../useLedgerQueries.ts'
import { useNow } from '../useNow.ts'

type EntryControl = Control<EntryFormValues, unknown, NewTransaction>
type Side = 'debit' | 'credit'

function accountLabel(account: Account) {
  return `${account.code} · ${account.name}`
}

/** Its own component so the ticking clock re-renders only this field, not the whole form. */
function CurrentDateField() {
  const now = useNow()
  return <TextField label="Current date" value={formatDateTime(now)} disabled helperText="Set automatically" size="small" />
}

interface AmountFieldProps {
  control: EntryControl
  setValue: UseFormSetValue<EntryFormValues>
  index: number
  side: Side
  withLabel: boolean
}

/** Debit XOR credit: a side is locked while the other one has a value, and typing in one clears the other. */
function AmountField({ control, setValue, index, side, withLabel }: AmountFieldProps) {
  const other: Side = side === 'debit' ? 'credit' : 'debit'
  const otherHasValue = useWatch({ control, name: `lines.${index}.${other}`, compute: (value) => value.trim() !== '' })
  const label = side === 'debit' ? 'Debit' : 'Credit'

  return (
    <Controller
      control={control}
      name={`lines.${index}.${side}`}
      render={({ field }) => (
        <TextField
          label={withLabel ? label : undefined}
          value={field.value}
          onChange={(event) => {
            field.onChange(event.target.value)
            if (event.target.value.trim() !== '') setValue(`lines.${index}.${other}`, '')
          }}
          onBlur={field.onBlur}
          inputRef={field.ref}
          // The TextField (not the Controller) is disabled, so the value stays registered.
          disabled={otherHasValue}
          placeholder="0"
          size="small"
          fullWidth
          // Let amount inputs shrink inside the phone layout's two-column row.
          sx={{ minWidth: 0 }}
          error={!isValidAmount(field.value)}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            htmlInput: {
              inputMode: 'decimal',
              'aria-label': `Line ${index + 1} ${side}`,
              style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
            },
          }}
        />
      )}
    />
  )
}

function AccountField({ control, index, accounts }: { control: EntryControl; index: number; accounts: Account[] }) {
  return (
    <Controller
      control={control}
      name={`lines.${index}.account`}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={accounts}
          value={field.value}
          onChange={(_, account) => field.onChange(account)}
          onBlur={field.onBlur}
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
          renderInput={(params) => (
            <TextField {...params} inputRef={field.ref} placeholder="Choose an account" error={fieldState.invalid} />
          )}
        />
      )}
    />
  )
}

interface RemoveLineButtonProps {
  index: number
  canRemove: boolean
  onRemove: (index: number) => void
}

function RemoveLineButton({ index, canRemove, onRemove }: RemoveLineButtonProps) {
  return (
    <Tooltip title={canRemove ? 'Remove line' : 'An entry needs at least 2 lines'}>
      <span>
        <IconButton aria-label={`Remove line ${index + 1}`} onClick={() => onRemove(index)} disabled={!canRemove} size="small">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  )
}

/** A live total; it watches only its side, so typing re-renders just this number. */
function SideTotal({ control, side }: { control: EntryControl; side: Side }) {
  const cents = useWatch({
    control,
    name: 'lines',
    compute: (lines) => lines.reduce((sum, line) => sum + (toCents(line[side]) ?? 0), 0),
  })
  return (
    <Typography component="span" variant="money" data-testid={`total-${side}`} sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
      {formatCents(cents)}
    </Typography>
  )
}

interface LinesProps {
  control: EntryControl
  setValue: UseFormSetValue<EntryFormValues>
  fieldIds: string[]
  accounts: Account[]
  canRemove: boolean
  onAdd: () => void
  onRemove: (index: number) => void
}

function LinesTable({ control, setValue, fieldIds, accounts, canRemove, onAdd, onRemove }: LinesProps) {
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
          {fieldIds.map((id, index) => (
            <TableRow key={id}>
              <TableCell>
                <AccountField control={control} index={index} accounts={accounts} />
              </TableCell>
              <TableCell>
                <AmountField control={control} setValue={setValue} index={index} side="debit" withLabel={false} />
              </TableCell>
              <TableCell>
                <AmountField control={control} setValue={setValue} index={index} side="credit" withLabel={false} />
              </TableCell>
              <TableCell align="center" sx={{ px: 1 }}>
                <RemoveLineButton index={index} canRemove={canRemove} onRemove={onRemove} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} sx={{ borderBottom: 'none', py: 1.5 }}>
              <Button startIcon={<AddIcon />} onClick={onAdd} size="small">
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
              <SideTotal control={control} side="debit" />
            </TableCell>
            <TableCell align="right">
              <SideTotal control={control} side="credit" />
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  )
}

/** Phone layout: each line is a small card with labeled amounts. */
function LinesStacked({ control, setValue, fieldIds, accounts, canRemove, onAdd, onRemove }: LinesProps) {
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }} aria-label="Entry lines">
      {fieldIds.map((id, index) => (
        <Paper key={id} variant="outlined" sx={{ p: 1.5, bgcolor: 'brand.50', borderRadius: '16px' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              Line {index + 1}
            </Typography>
            <RemoveLineButton index={index} canRemove={canRemove} onRemove={onRemove} />
          </Stack>
          <Stack spacing={1.5}>
            <AccountField control={control} index={index} accounts={accounts} />
            <Stack direction="row" spacing={1}>
              <AmountField control={control} setValue={setValue} index={index} side="debit" withLabel />
              <AmountField control={control} setValue={setValue} index={index} side="credit" withLabel />
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Box>
        <Button startIcon={<AddIcon />} onClick={onAdd} size="small">
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
        <SideTotal control={control} side="debit" />
        <Typography color="text.secondary">Total credit</Typography>
        <SideTotal control={control} side="credit" />
      </Box>
    </Stack>
  )
}

function BalanceChip({ control }: { control: EntryControl }) {
  const { isBalanced, difference, totalDebit, totalCredit } = useWatch({ control, name: 'lines', compute: entryTotals })
  if (isBalanced) {
    return <Chip icon={<CheckIcon />} label="Balanced" sx={{ '& .MuiChip-icon': { color: 'brand.900' } }} />
  }
  if (totalDebit + totalCredit === 0) {
    return <Chip label="No amounts yet" variant="outlined" />
  }
  return (
    <Chip
      icon={<ErrorOutlineIcon />}
      label={
        <>
          Difference{' '}
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCents(Math.abs(difference))}
          </Box>
        </>
      }
      sx={{ bgcolor: danger.surface, color: danger.main, '& .MuiChip-icon': { color: danger.main } }}
    />
  )
}

/** The first rule the entry still breaks, shown next to the disabled Save button. */
function SaveHint({ control }: { control: EntryControl }) {
  const problem = useWatch({ control, compute: firstProblem })
  if (!problem) return null
  return (
    <Typography variant="body2" color="text.secondary">
      {problem}
    </Typography>
  )
}

export default function EntryForm({ accounts }: { accounts: Account[] }) {
  const brand = useBrand()
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'))
  const { form, lines, canRemoveLine } = useEntryForm()
  const { control, setValue, handleSubmit, reset, formState } = form
  const save = useCreateTransaction()
  const [savedNumber, setSavedNumber] = useState<string | null>(null)

  const onSubmit = handleSubmit((payload) => {
    if (save.isPending) return
    save.mutate(payload, {
      onSuccess: (created) => {
        setSavedNumber(created.numbering)
        reset(emptyEntry())
      },
    })
  })

  const linesProps: LinesProps = {
    control,
    setValue,
    fieldIds: lines.fields.map((field) => field.id),
    accounts,
    canRemove: canRemoveLine,
    onAdd: () => lines.append(emptyLine(), { shouldFocus: false }),
    onRemove: (index) => {
      if (canRemoveLine) lines.remove(index)
    },
  }

  return (
    <Box component="form" noValidate onSubmit={onSubmit} sx={{ ...cardSx(brand), p: { xs: 2.5, sm: 4 } }}>
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
        <CurrentDateField />
        <FormTextField
          control={control}
          name="appliedDate"
          label="Applied date"
          type="date"
          required
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormTextField
          control={control}
          name="supplier"
          label="Supplier"
          placeholder="Person or company (optional)"
          size="small"
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <FormTextField
          control={control}
          name="description"
          label="Description"
          placeholder="What was this movement? (optional)"
          size="small"
          sx={{ gridColumn: '1 / -1' }}
        />
      </Box>

      {isCompact ? <LinesStacked {...linesProps} /> : <LinesTable {...linesProps} />}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <BalanceChip control={control} />
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end' }}
        >
          <SaveHint control={control} />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formState.isValid}
            loading={save.isPending}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Save entry
          </Button>
        </Stack>
      </Stack>

      {save.error && (
        <Alert severity="error" onClose={save.reset} sx={{ mt: 2 }}>
          {save.error.messages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </Alert>
      )}

      <Snackbar
        open={savedNumber !== null}
        autoHideDuration={4000}
        onClose={() => setSavedNumber(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSavedNumber(null)} sx={{ fontWeight: 600 }}>
          Entry #{savedNumber} saved
        </Alert>
      </Snackbar>
    </Box>
  )
}
