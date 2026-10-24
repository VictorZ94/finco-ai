import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** False when frontend_finco_ai/.env is missing the VITE_FIREBASE_* values. */
export const isFirebaseConfigured = Object.values(config).every(Boolean)

/** Firebase Auth, or null when not configured (the login page explains what is missing). */
export const auth: Auth | null = isFirebaseConfigured ? getAuth(initializeApp(config)) : null
