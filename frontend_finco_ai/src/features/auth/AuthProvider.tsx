import { useEffect, useState, type ReactNode } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '../../lib/firebase.ts'
import { AuthContext, type AppUserProfile, type AuthSession } from './authContext.ts'
import { registerWithBackend } from './authService.ts'

/** Tracks the Firebase session (persisted by the SDK across reloads) and the backend profile. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(() =>
    auth ? { status: 'loading', user: null } : { status: 'signedOut', user: null },
  )
  const [profile, setProfile] = useState<AppUserProfile | null>(null)

  useEffect(() => {
    if (!auth) return
    let registeredUid: string | null = null
    // onIdTokenChanged (not onAuthStateChanged) also fires after profile updates that
    // refresh the token, e.g. the display name set right after sign-up.
    return onIdTokenChanged(auth, (user) => {
      if (user) {
        setSession({ status: 'signedIn', user })
        if (registeredUid !== user.uid) {
          registeredUid = user.uid
          // Registers the user with the backend (profile + default chart) and loads their settings.
          registerWithBackend()
            .then((me) => {
              if (registeredUid === user.uid) setProfile(me)
            })
            .catch(() => {
              // Pages load their own data and report errors; nothing to show here.
            })
        }
      } else {
        registeredUid = null
        setSession({ status: 'signedOut', user: null })
        setProfile(null)
      }
    })
  }, [])

  return <AuthContext value={{ ...session, profile }}>{children}</AuthContext>
}
