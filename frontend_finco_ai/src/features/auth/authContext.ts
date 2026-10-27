import { createContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthSession =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User }

export const AuthContext = createContext<AuthSession>({ status: 'loading', user: null })
