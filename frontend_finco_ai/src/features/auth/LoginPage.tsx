import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import GoogleIcon from '@mui/icons-material/Google'
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
import { useAuth } from './useAuth.ts'

type Mode = 'signIn' | 'signUp'

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
  const [mode, setMode] = useState<Mode>('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/chat'} replace />
  }

  async function run(action: () => Promise<void>) {
    setIsBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setIsBusy(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run(() =>
      mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(name, email, password),
    )
  }

  function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email first, then choose "Forgot password?".')
      return
    }
    void run(async () => {
      await sendPasswordReset(email)
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`)
    })
  }

  const isSignUp = mode === 'signUp'

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
            onChange={(_, value: Mode) => {
              setMode(value)
              setError(null)
              setNotice(null)
            }}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'brand.100' }}
          >
            <Tab label="Sign in" value="signIn" />
            <Tab label="Create account" value="signUp" />
          </Tabs>

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            {isSignUp && (
              <TextField
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            )}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              helperText={isSignUp ? 'At least 6 characters.' : undefined}
              required
            />
            {!isSignUp && (
              <Box sx={{ textAlign: 'right', mt: '-4px !important' }}>
                <Link component="button" type="button" variant="body2" onClick={handleForgotPassword}>
                  Forgot password?
                </Link>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}

            <Button type="submit" variant="contained" size="large" loading={isBusy} disabled={!isFirebaseConfigured}>
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </Stack>

          <Divider sx={{ my: 3, color: 'text.secondary', fontSize: '0.875rem' }}>or</Divider>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => void run(signInWithGoogle)}
            disabled={isBusy || !isFirebaseConfigured}
          >
            Continue with Google
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
