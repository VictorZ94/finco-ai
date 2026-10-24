import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
} from 'firebase/auth'
import { apiFetch } from '../../lib/apiClient.ts'
import { auth } from '../../lib/firebase.ts'
import type { AppUserProfile } from './authContext.ts'

function requireAuth(): Auth {
  if (!auth) throw new Error('Firebase is not configured.')
  return auth
}

/** Registers the signed-in user with the backend (creates their profile and default chart). */
export function registerWithBackend(): Promise<AppUserProfile> {
  return apiFetch<AppUserProfile>('/api/me/')
}

/** Saves the user's brand color seed (#RRGGBB, or "" for the default). */
export function saveAccentColor(accentColor: string): Promise<AppUserProfile> {
  return apiFetch<AppUserProfile>('/api/me/', {
    method: 'PATCH',
    body: JSON.stringify({ accent_color: accentColor }),
  })
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(requireAuth(), email.trim(), password)
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password)
  if (name.trim()) {
    await updateProfile(user, { displayName: name.trim() })
    // Refresh the token so it carries the new name, then update the backend profile.
    await user.getIdToken(true)
    await registerWithBackend()
  }
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(requireAuth(), new GoogleAuthProvider())
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email.trim())
}

export async function signOutUser(): Promise<void> {
  await signOut(requireAuth())
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/cancelled-popup-request': 'The Google window was closed before signing in.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
}

/** A user-facing message for a Firebase Auth error. */
export function friendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? `Sign-in failed (${error.code}).`
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
