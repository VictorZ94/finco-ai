# Step 08 — Hooks own the request

## Why
Step 07 split every feature's server state into three files: `*Service.ts` (axios call), `queries.ts` (keys + `queryOptions`) and a `use*.ts` wrapper. Reading one request meant opening all three. This step merges them: a hook in `src/hooks/<feature>/` holds the keys, the `api` call and the cache updates.

Decided with the user:
- the hooks live in `src/hooks/<feature>/`, outside `features/`;
- URLs live in one place, `src/lib/endpoints.ts`;
- files touched here use double quotes + semicolons.

There are no behavior changes.

## The pattern
```ts
export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (month: string) => ["dashboard", "summary", month] as const,
};

export function useDashboardSummary(month: string) {
  return useQuery({
    queryKey: dashboardKeys.summary(month),
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>(endpoints.dashboard.summary(month));
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
```
- Mutations work the same way and update the cache in `onSuccess`, using keys imported from the hook file that owns them. For example, `useCreateTransaction` prepends to `ledgerKeys.transactions` and invalidates `dashboardKeys.all`.
- Components import only these hooks. They never call `api`, `useQuery` or `useMutation` against the API themselves.

## Files
| Hook file | Exports | Endpoint |
|---|---|---|
| `hooks/dashboard/useDashboardSummary.ts` | `dashboardKeys`, `useDashboardSummary` | `GET /dashboard/summary/?month=` |
| `hooks/ledger/useLedgerQueries.ts` | `ledgerKeys`, `useAccounts`, `useTransactions`, `useCreateTransaction` | `GET /accounts/?postable=true`, `GET/POST /transactions/` |
| `hooks/auth/useProfile.ts` | `profileKeys`, `useProfile`, `useSaveAccentColor` | `GET/PATCH /me/` |

Removed: `features/dashboard/{dashboardService,queries,useDashboardSummary}.ts`, `features/ledger/{ledgerService,queries,useLedgerQueries}.ts`, `features/auth/{queries,useProfile}.ts`, and `fetchProfile`/`saveAccentColor` from `authService.ts`.

## Kept on purpose
- `authService.ts` wraps the Firebase SDK, not our API. `LoginPage` still runs Google sign-in and the password reset through inline `useMutation`s.
- `chatService.ts` is still a mock. Once the `ai_chat` API exists, it becomes `hooks/chat/` plus `endpoints.chat`.
- `useAuth`, `useEntryForm`, `useNow` and `useBrand` hold UI or local state, so they stay in their features.

## Verification
`npm run build`, `npm run lint` and `npm run test` (52 tests) pass.
