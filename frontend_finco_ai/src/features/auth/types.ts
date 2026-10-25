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
