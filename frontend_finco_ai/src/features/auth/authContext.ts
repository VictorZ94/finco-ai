import { createContext } from 'react'
import type { User } from 'firebase/auth'

/** The backend's view of the signed-in user (GET /api/me/). */
export interface AppUserProfile {
  uid: string
  email: string
  display_name: string
  sign_in_provider: string
  email_verified: boolean
  /** Chosen brand color seed (#RRGGBB), or "" for the default. */
  accent_color: string
  created_at: string
}

export type AuthSession =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User }

export type AuthState = AuthSession & { profile: AppUserProfile | null }

export const AuthContext = createContext<AuthState>({ status: 'loading', user: null, profile: null })
