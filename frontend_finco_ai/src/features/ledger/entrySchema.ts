import { z } from 'zod'
import { todayIso } from '../../lib/dates.ts'
import { centsToApi, isValidAmount, toCents } from '../../lib/money.ts'
import type { Account, NewTransaction } from './types.ts'

export const MIN_LINES = 2

const lineSchema = z.object({
  account: z.custom<Account>().nullable(),
  // Raw text as typed; validated and converted to cents below.
  debit: z.string(),
  credit: z.string(),
})

/** Debit XOR credit, at least 2 lines, balanced totals: the same rules the API enforces. */
export const entrySchema = z
  .object({
    appliedDate: z.string(),
    supplier: z.string(),
    description: z.string(),
    lines: z.array(lineSchema),
  })
  // One refinement with plain string fields: zod skips an object's refinements once a field fails,
  // and every rule should report at the same time.
  .superRefine((entry, ctx) => {
    if (!entry.appliedDate) ctx.addIssue({ code: 'custom', path: ['appliedDate'], message: 'Choose an applied date.' })
    if (entry.supplier.length > 255) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Use at most 255 characters.' })
    if (entry.lines.length < MIN_LINES) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: `An entry needs at least ${MIN_LINES} lines.` })
    }

    let totalDebit = 0
    let totalCredit = 0
    entry.lines.forEach((line, i) => {
      const prefix = `Line ${i + 1}: `
      if (!line.account) ctx.addIssue({ code: 'custom', path: ['lines', i, 'account'], message: `${prefix}choose an account.` })

      const amountsValid = (['debit', 'credit'] as const).every((side) => {
        if (isValidAmount(line[side])) return true
        ctx.addIssue({ code: 'custom', path: ['lines', i, side], message: `${prefix}amounts are numbers with up to 2 decimals.` })
        return false
      })
      if (!amountsValid) return

      const debit = toCents(line.debit) ?? 0
      const credit = toCents(line.credit) ?? 0
      if (debit > 0 && credit > 0) {
        ctx.addIssue({ code: 'custom', path: ['lines', i, 'credit'], message: `${prefix}use a debit or a credit, not both.` })
      } else if (debit === 0 && credit === 0) {
        ctx.addIssue({ code: 'custom', path: ['lines', i, 'debit'], message: `${prefix}enter a debit or a credit amount.` })
      }
      totalDebit += debit
      totalCredit += credit
    })

    if (totalDebit === 0 || totalDebit !== totalCredit) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Total debits must equal total credits.' })
    }
  })
  .transform(
    (entry): NewTransaction => ({
      applied_date: entry.appliedDate,
      supplier: entry.supplier.trim(),
      description: entry.description.trim(),
      lines: entry.lines.map((line) => ({
        account: line.account!.id,
        debit: centsToApi(toCents(line.debit) ?? 0),
        credit: centsToApi(toCents(line.credit) ?? 0),
      })),
    }),
  )

/** What the form edits: amounts are the raw text the user typed. */
export type EntryFormValues = z.input<typeof entrySchema>
export type EntryLineValues = EntryFormValues['lines'][number]

export function emptyLine(): EntryLineValues {
  return { account: null, debit: '', credit: '' }
}

export function emptyEntry(): EntryFormValues {
  return { appliedDate: todayIso(), supplier: '', description: '', lines: Array.from({ length: MIN_LINES }, emptyLine) }
}

/** The first rule the entry still breaks, for the hint next to Save; null when it can be saved. */
export function firstProblem(values: EntryFormValues): string | null {
  const result = entrySchema.safeParse(values)
  return result.success ? null : (result.error.issues[0]?.message ?? null)
}

/** Running totals in cents; invalid amounts count as 0. */
export function entryTotals(lines: EntryLineValues[]) {
  const totalDebit = lines.reduce((sum, line) => sum + (toCents(line.debit) ?? 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (toCents(line.credit) ?? 0), 0)
  return { totalDebit, totalCredit, difference: totalDebit - totalCredit, isBalanced: totalDebit > 0 && totalDebit === totalCredit }
}
