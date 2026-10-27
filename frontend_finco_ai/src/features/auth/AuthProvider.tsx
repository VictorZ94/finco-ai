import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '../../lib/firebase.ts'
import { AuthContext, type AuthSession } from './authContext.ts'

/** Tracks the Firebase session (persisted by the SDK across reloads). The profile is a query: see useProfile. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<AuthSession>(() =>
    auth ? { status: 'loading', user: null } : { status: 'signedOut', user: null },
  )

  useEffect(() => {
    if (!auth) return
    // onIdTokenChanged (not onAuthStateChanged) also fires after profile updates that
    // refresh the token, e.g. the display name set right after sign-up.
    return onIdTokenChanged(auth, (user) => {
      if (user) {
        setSession({ status: 'signedIn', user })
      } else {
        setSession({ status: 'signedOut', user: null })
        // Never show one user's cached data to the next one.
        queryClient.clear()
      }
    })
  }, [queryClient])

  return <AuthContext value={session}>{children}</AuthContext>
}
