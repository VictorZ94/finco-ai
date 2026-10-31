import { useSearchParams } from 'react-router'
import { todayIso } from '../../lib/dates.ts'
import { readPeriod } from './periods.ts'
import type { Period } from './types.ts'

/** The report period lives in the URL (?from=&to=), so it survives tab switches and can be bookmarked. */
export function usePeriod() {
  const [params, setParams] = useSearchParams()
  const period = readPeriod(params, todayIso())

  const setPeriod = (next: Period) =>
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev)
        updated.set('from', next.from)
        updated.set('to', next.to)
        return updated
      },
      { replace: true },
    )

  /** Any other report option kept in the URL (e.g. the ledger's account). */
  const setParam = (name: string, value: string | null) =>
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev)
        if (value) updated.set(name, value)
        else updated.delete(name)
        return updated
      },
      { replace: true },
    )

  return { period, setPeriod, params, setParam }
}
