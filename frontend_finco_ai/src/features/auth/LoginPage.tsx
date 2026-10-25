import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import GoogleIcon from '@mui/icons-material/Google'
import FormTextField from '../../components/FormTextField.tsx'
import Wordmark from '../../components/Wordmark.tsx'
import { isFirebaseConfigured } from '../../lib/firebase.ts'
import { revealSx } from '../../theme/motion.ts'
import { concentricRings } from '../../theme/patterns.ts'
import { radius } from '../../theme/tokens.ts'
import { useBrand } from '../../theme/useBrand.ts'
import {
  friendlyAuthError,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './authService.ts'
import { signInSchema, signUpSchema, type AuthMode, type Credentials, type CredentialsInput } from './authSchemas.ts'
import { profileKeys } from './queries.ts'
import { useAuth } from './useAuth.ts'

/** The brand side: a tinted card with faint rings, like the reference's "Gain control". */
function BrandPanel() {
  const brand = useBrand()
  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex' }}>
      <Box
        sx={{
          flex: 1,
          bgcolor: 'brand.400',
          ...concentricRings(brand[200], 0.55),
          borderRadius: radius.card,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
          minHeight: { xs: 200, md: 'calc(100dvh - 32px)' },
          p: { xs: 3, md: 6 },
          ...revealSx(0),
        }}
      >
        <Wordmark size="large" />
        <Box>
          <Typography
            variant="h1"
            component="p"
            sx={{ fontSize: { xs: '2.25rem', md: '3.5rem' }, maxWidth: '11ch', mb: { xs: 0, md: 2 } }}
          >
            Gain control of your money
          </Typography>
          <Typography sx={{ display: { xs: 'none', md: 'block' }, color: 'brand.950', maxWidth: '40ch', fontSize: '1.0625rem' }}>
            Tell FincoAI what you spent or earned. It keeps a proper double-entry ledger of your money, in pesos.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default function LoginPage() {
  const { status } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<AuthMode>('signIn')
  const isSignUp = mode === 'signUp'

  // One form for both tabs (the typed email survives a tab switch); the schema follows the active tab.
  const resolver: Resolver<CredentialsInput, unknown, Credentials> = (values, context, options) =>
    zodResolver(isSignUp ? signUpSchema : signInSchema)(values, context, options)
  const { control, handleSubmit, trigger, getValues, setError, clearErrors, formState } = useForm<
    CredentialsInput,
    unknown,
    Credentials
  >({ resolver, defaultValues: { name: '', email: '', password: '' } })
  const { errors, isSubmitting } = formState

  // Not form submits: their pending/error state comes from mutations. Errors are Firebase's, not ApiError.
  const google = useMutation<void, unknown>({ mutationFn: signInWithGoogle })
  const reset = useMutation<void, unknown, string>({ mutationFn: sendPasswordReset })

  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />
  }

  function clearMessages() {
    clearErrors()
    google.reset()
    reset.reset()
  }

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    google.reset()
    reset.reset()
    try {
      if (isSignUp) {
        await signUpWithEmail(name, email, password)
        // The profile was fetched before the name was set; load it again with the new name.
        await queryClient.invalidateQueries({ queryKey: profileKeys.all })
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      setError('root', { message: friendlyAuthError(err) })
    }
  })

  async function handleForgotPassword() {
    clearMessages()
    if (await trigger('email')) reset.mutate(getValues('email').trim())
  }

  // Only one message at a time: the latest action's.
  const error = errors.root?.message ?? (google.isError ? friendlyAuthError(google.error) : null) ??
    (reset.isError ? friendlyAuthError(reset.error) : null)
  const isBusy = isSubmitting || google.isPending || reset.isPending

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
        bgcolor: '#FFFFFF',
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
      }}
    >
      <BrandPanel />

      <Box sx={{ display: 'grid', placeItems: 'center', px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 400, ...revealSx(1) }}>
          <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {isSignUp ? 'It takes a minute. Your chart of accounts is ready when you are.' : 'Sign in to your ledger.'}
          </Typography>

          {!isFirebaseConfigured && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Firebase is not configured. Add the VITE_FIREBASE_* values to frontend_finco_ai/.env and restart the
              dev server.
            </Alert>
          )}

          <Tabs
            value={mode}
            onChange={(_, value: AuthMode) => {
              setMode(value)
              clearMessages()
            }}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'brand.100' }}
          >
            <Tab label="Sign in" value="signIn" />
            <Tab label="Create account" value="signUp" />
          </Tabs>

          <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
            {isSignUp && <FormTextField control={control} name="name" label="Name" autoComplete="name" />}
            <FormTextField control={control} name="email" label="Email" type="email" autoComplete="email" required />
            <FormTextField
              control={control}
              name="password"
              label="Password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              helperText={isSignUp ? 'At least 6 characters.' : undefined}
              required
            />
            {!isSignUp && (
              <Box sx={{ textAlign: 'right', mt: '-4px !important' }}>
                <Link component="button" type="button" variant="body2" onClick={() => void handleForgotPassword()}>
                  Forgot password?
                </Link>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {reset.isSuccess && (
              <Alert severity="success">If an account exists for {reset.variables}, a reset link is on its way.</Alert>
            )}

            <Button type="submit" variant="contained" size="large" loading={isSubmitting} disabled={isBusy || !isFirebaseConfigured}>
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </Stack>

          <Divider sx={{ my: 3, color: 'text.secondary', fontSize: '0.875rem' }}>or</Divider>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => {
              clearMessages()
              google.mutate()
            }}
            disabled={isBusy || !isFirebaseConfigured}
          >
            Continue with Google
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
