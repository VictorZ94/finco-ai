import { describe, expect, it } from 'vitest'
import { emailSchema, signInSchema, signUpSchema } from './authSchemas.ts'

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : result.error!.issues.map((issue) => issue.message)
}

describe('auth schemas', () => {
  it('requires email and password to sign in', () => {
    expect(messages(signInSchema.safeParse({ name: '', email: '', password: '' }))).toEqual([
      'Enter your email.',
      'Enter your password.',
    ])
  })

  it('rejects a malformed email and trims a valid one', () => {
    expect(messages(emailSchema.safeParse('not-an-email'))).toEqual(['That email address is not valid.'])
    expect(emailSchema.parse('  ana@example.com ')).toBe('ana@example.com')
  })

  it('needs 6 characters to sign up but any password to sign in', () => {
    const values = { name: 'Ana', email: 'ana@example.com', password: '12345' }
    expect(messages(signUpSchema.safeParse(values))).toEqual(['Use at least 6 characters.'])
    expect(signInSchema.safeParse(values).success).toBe(true)
  })
})
