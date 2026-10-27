import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import type { NewTransaction } from './types.ts'
import { emptyEntry, entrySchema, MIN_LINES, type EntryFormValues } from './entrySchema.ts'

/** The journal-entry form: values are what the user typed; a valid submit yields the API payload. */
export function useEntryForm() {
  const form = useForm<EntryFormValues, unknown, NewTransaction>({
    resolver: zodResolver(entrySchema),
    defaultValues: emptyEntry(),
    mode: 'onTouched',
  })
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  return { form, lines, canRemoveLine: lines.fields.length > MIN_LINES }
}
