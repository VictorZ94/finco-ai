import { z } from 'zod'

export type AuthMode = 'signIn' | 'signUp'

/** Used alone by "Forgot password?" (via trigger) and inside both forms. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .pipe(z.email('That email address is not valid.'))

export const signInSchema = z.object({
  name: z.string().trim(),
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export const signUpSchema = signInSchema.extend({
  // Firebase's own minimum; checked here so the user learns it before the round trip.
  password: z.string().min(6, 'Use at least 6 characters.'),
})

export type CredentialsInput = z.input<typeof signInSchema>
export type Credentials = z.output<typeof signInSchema>
