import { useState } from 'react'
import { todayIso } from './dates.ts'
import { centsToApi, isValidAmount, toCents } from './money.ts'
import type { LedgerLine, NewTransaction } from './types.ts'

const MIN_LINES = 2

function emptyLine(): LedgerLine {
  return { key: crypto.randomUUID(), account: null, debit: '', credit: '' }
}

function initialLines(): LedgerLine[] {
  return Array.from({ length: MIN_LINES }, emptyLine)
}

export function useLedgerForm() {
  const [appliedDate, setAppliedDate] = useState(todayIso)
  const [supplier, setSupplier] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LedgerLine[]>(initialLines)

  function updateLine(key: string, patch: Partial<Omit<LedgerLine, 'key'>>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const next = { ...line, ...patch }
        // Debit XOR credit: typing in one side clears the other.
        if (patch.debit !== undefined && patch.debit.trim() !== '') next.credit = ''
        if (patch.credit !== undefined && patch.credit.trim() !== '') next.debit = ''
        return next
      }),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > MIN_LINES ? prev.filter((line) => line.key !== key) : prev))
  }

  function reset() {
    setAppliedDate(todayIso())
    setSupplier('')
    setDescription('')
    setLines(initialLines())
  }

  const totalDebit = lines.reduce((sum, line) => sum + (toCents(line.debit) ?? 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (toCents(line.credit) ?? 0), 0)
  const difference = totalDebit - totalCredit
  const isBalanced = totalDebit > 0 && difference === 0

  const problems: string[] = []
  if (!appliedDate) problems.push('Choose an applied date.')
  if (lines.some((line) => !line.account)) problems.push('Choose an account on every line.')
  if (lines.some((line) => !isValidAmount(line.debit) || !isValidAmount(line.credit))) {
    problems.push('Amounts must be numbers with up to 2 decimals.')
  }
  if (lines.some((line) => !(toCents(line.debit) || toCents(line.credit)))) {
    problems.push('Every line needs a debit or a credit amount.')
  }
  if (!isBalanced) problems.push('Total debits must equal total credits.')

  function toPayload(): NewTransaction {
    return {
      applied_date: appliedDate,
      supplier: supplier.trim(),
      description: description.trim(),
      lines: lines.map((line) => ({
        account: line.account!.id,
        debit: centsToApi(toCents(line.debit) ?? 0),
        credit: centsToApi(toCents(line.credit) ?? 0),
      })),
    }
  }

  return {
    appliedDate,
    setAppliedDate,
    supplier,
    setSupplier,
    description,
    setDescription,
    lines,
    updateLine,
    addLine,
    removeLine,
    canRemoveLine: lines.length > MIN_LINES,
    totalDebit,
    totalCredit,
    difference,
    isBalanced,
    problems,
    canSave: problems.length === 0,
    toPayload,
    reset,
  }
}

export type LedgerForm = ReturnType<typeof useLedgerForm>
