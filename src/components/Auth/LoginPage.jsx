// src/components/Auth/LoginPage.jsx
// ──────────────────────────────────────────────────────────────
// Full-screen auth page with Google sign-in + email/password flows.
// ──────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, PenLine } from 'lucide-react'

// Google "G" logo as inline SVG (no external image needed)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function getFriendlyErrorMessage(error) {
  const code = error?.code ?? ''

  if (code === 'auth/email-already-in-use') return 'This email is already registered'
  if (code === 'auth/wrong-password') return 'Incorrect password'
  if (code === 'auth/user-not-found') return 'No account found with this email'
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters'
  if (code === 'auth/invalid-email') return 'Please enter a valid email address'
  if (code === 'auth/invalid-credential') return 'Incorrect email or password'

  return error?.message || 'Something went wrong. Please try again.'
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function evaluatePasswordStrength(password = '') {
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[^A-Za-z0-9]/.test(password)

  if (password.length >= 8 && hasNumbers && hasSymbols) {
    return { label: 'Strong', color: 'bg-green-500' }
  }

  if (password.length >= 6 && password.length <= 10 && hasNumbers) {
    return { label: 'Medium', color: 'bg-yellow-500' }
  }

  return { label: 'Weak', color: 'bg-red-500' }
}

export default function LoginPage({
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onPasswordReset,
  onGuestSignIn,
}) {
  const [view, setView] = useState('login')
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingPrimary, setLoadingPrimary] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [resetEmail, setResetEmail] = useState('')

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(signupPassword),
    [signupPassword]
  )

  const canSubmitLogin = useMemo(
    () => Boolean(loginEmail.trim() && loginPassword.trim()),
    [loginEmail, loginPassword]
  )

  const canSubmitSignup = useMemo(
    () => {
      return Boolean(
        name.trim() &&
        isValidEmail(signupEmail) &&
        signupPassword.length >= 6 &&
        confirmPassword.length >= 6 &&
        signupPassword === confirmPassword
      )
    },
    [name, signupEmail, signupPassword, confirmPassword]
  )

  const canSubmitReset = useMemo(
    () => Boolean(isValidEmail(resetEmail)),
    [resetEmail]
  )

  const goToView = (nextView) => {
    setView(nextView)
    setError('')
    if (nextView !== 'reset') setResetSent(false)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoadingGoogle(true)
    try {
      await onGoogleSignIn?.()
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingGoogle(false)
    }
  }

  const handleEmailSignIn = async (event) => {
    event.preventDefault()
    setError('')

    if (!isValidEmail(loginEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (!loginPassword) {
      setError('Please enter your password')
      return
    }

    setLoadingPrimary(true)
    try {
      await onEmailSignIn?.(loginEmail.trim(), loginPassword)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingPrimary(false)
    }
  }

  const handleCreateAccount = async (event) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!isValidEmail(signupEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoadingPrimary(true)
    try {
      await onEmailSignUp?.(signupEmail.trim(), signupPassword, name.trim())
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingPrimary(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setError('')
    setResetSent(false)

    if (!isValidEmail(resetEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoadingPrimary(true)
    try {
      await onPasswordReset?.(resetEmail.trim())
      setResetSent(true)
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingPrimary(false)
    }
  }

  const handleGuestSignIn = async () => {
    setError('')
    setLoadingPrimary(true)
    try {
      await onGuestSignIn?.()
    } catch (err) {
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingPrimary(false)
    }
  }

  return (
    <div className="min-h-full bg-parchment-50 dark:bg-dark-bg flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-parchment-100 dark:bg-dark-surface flex-col justify-between p-12 relative overflow-hidden">
        {/* Soft mesh background */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(45,106,79,0.2), transparent 35%),
              radial-gradient(circle at 80% 10%, rgba(45,106,79,0.12), transparent 40%),
              radial-gradient(circle at 70% 80%, rgba(26,26,24,0.08), transparent 45%)
            `,
          }}
        />

        {/* Quote block */}
        <div className="relative mt-auto">
          <p className="font-heading text-3xl text-ink dark:text-dark-text leading-snug mb-4">
            "A note is a thought given<br />a place to live."
          </p>
          <p className="text-sm text-ink-muted dark:text-dark-muted font-medium">
            Write. Organise. Remember.
          </p>
        </div>

        {/* Decorative element */}
        <div className="absolute bottom-12 right-12 opacity-10">
          <PenLine size={120} className="text-ink" strokeWidth={0.8} />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-sage dark:bg-sage-dark flex items-center justify-center shadow-md">
              <PenLine size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-semibold text-xl text-ink dark:text-dark-text leading-none">
                NoteFlow
              </h1>
              <p className="text-xs text-ink-muted dark:text-dark-muted mt-0.5">Your thoughts, organised</p>
            </div>
          </div>

          <div className="transition-all duration-200">
            {view === 'login' && (
              <div>
                <h2 className="font-heading text-3xl font-semibold text-ink dark:text-dark-text mb-2">Welcome back</h2>
                <p className="text-sm text-ink-muted dark:text-dark-muted mb-6">Sign in to access your notes from any device.</p>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loadingGoogle || loadingPrimary}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white dark:bg-dark-elevated border border-parchment-200 dark:border-dark-border rounded-xl text-ink dark:text-dark-text font-medium text-sm shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Sign in with Google"
                >
                  {loadingGoogle ? (
                    <div className="w-4 h-4 border-2 border-ink-muted border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {loadingGoogle ? 'Signing in...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-parchment-200 dark:bg-dark-border" />
                  <span className="text-xs text-ink-muted dark:text-dark-muted uppercase tracking-wide">or</span>
                  <div className="h-px flex-1 bg-parchment-200 dark:bg-dark-border" />
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2.5 rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-secondary outline-none focus:ring-2 focus:ring-sage/25 dark:focus:ring-sage-dark/25 transition-all"
                  />

                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2.5 pr-10 rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-secondary outline-none focus:ring-2 focus:ring-sage/25 dark:focus:ring-sage-dark/25 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted dark:text-dark-muted"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingPrimary || loadingGoogle || !canSubmitLogin}
                    className="w-full py-2.5 rounded-xl bg-sage dark:bg-sage-dark text-white text-sm font-medium hover:bg-sage-light dark:hover:bg-sage-darkHover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingPrimary ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <p className="text-sm text-ink-muted dark:text-dark-muted mt-4">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => goToView('signup')} className="text-sage hover:underline">Sign up</button>
                </p>
                <p className="text-sm text-ink-muted dark:text-dark-muted mt-1">
                  <button type="button" onClick={() => goToView('reset')} className="text-sage hover:underline">Forgot password?</button>
                </p>

                <div className="mt-5 pt-4 border-t border-parchment-200 dark:border-dark-border text-center">
                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    disabled={loadingPrimary || loadingGoogle}
                    className="px-4 py-2 rounded-xl border border-parchment-200 dark:border-dark-border text-sm text-ink-muted dark:text-dark-secondary hover:bg-parchment-100 dark:hover:bg-dark-elevated transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Continue as Guest
                  </button>
                  <p className="mt-2 text-xs text-ink-muted dark:text-dark-muted">
                    No account needed - Notes saved locally for this session only
                  </p>
                </div>
              </div>
            )}

            {view === 'signup' && (
              <div>
                <button
                  type="button"
                  onClick={() => goToView('login')}
                  className="inline-flex items-center gap-1 text-sm text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text mb-4"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <h2 className="font-serif text-2xl font-semibold text-ink dark:text-dark-text mb-5">Create account</h2>

                <form onSubmit={handleCreateAccount} className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage transition-colors"
                  />

                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2.5 rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage transition-colors"
                  />

                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted dark:text-dark-muted"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted dark:text-dark-muted"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 bg-parchment-200 dark:bg-dark-border rounded-full overflow-hidden">
                      <div className={`h-full ${passwordStrength.color} transition-all duration-150 ${signupPassword ? 'w-full' : 'w-0'}`} />
                    </div>
                    <p className="text-xs text-ink-muted dark:text-dark-muted">Password strength: <span className="font-medium">{passwordStrength.label}</span></p>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingPrimary || !canSubmitSignup}
                    className="w-full py-2.5 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingPrimary ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>

                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <p className="text-sm text-ink-muted dark:text-dark-muted mt-4">
                  Already have an account?{' '}
                  <button type="button" onClick={() => goToView('login')} className="text-sage hover:underline">Sign in</button>
                </p>
              </div>
            )}

            {view === 'reset' && (
              <div>
                <button
                  type="button"
                  onClick={() => goToView('login')}
                  className="inline-flex items-center gap-1 text-sm text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text mb-4"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <h2 className="font-serif text-2xl font-semibold text-ink dark:text-dark-text mb-2">Reset password</h2>
                <p className="text-sm text-ink-muted dark:text-dark-muted mb-5">Enter your email and we'll send you a reset link</p>

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2.5 rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={loadingPrimary || !canSubmitReset}
                    className="w-full py-2.5 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingPrimary ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </form>

                {resetSent && (
                  <p className="mt-3 text-sm text-green-600 dark:text-green-400">Reset email sent! Check your inbox.</p>
                )}
                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            )}
          </div>

          <p className="text-xs text-ink-muted dark:text-dark-muted text-center mt-6 leading-relaxed">
            By signing in, your notes are securely stored and synced<br />
            across all your devices via Firebase.
          </p>
        </div>
      </div>
    </div>
  )
}
