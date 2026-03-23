import { useEffect, useState } from 'react'
import { X, UserRound, Loader2 } from 'lucide-react'
import { getUserProfile, saveUserProfile } from '../../firebase/firestore'

const MAX_LENGTH = 120

export default function Profile({ user, open, onClose }) {
  const [displayName, setDisplayName] = useState('')
  const [hobby, setHobby] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ type: '', message: '' })

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const load = async () => {
      setError('')
      setLoading(true)
      setToast({ type: '', message: '' })

      if (!user?.uid) {
        setDisplayName('')
        setHobby('')
        setLoading(false)
        return
      }

      try {
        const profile = await getUserProfile(user.uid)
        if (cancelled) return

        const authDisplayName = user.displayName ?? ''
        const storedDisplayName = profile?.displayName ?? ''
        setDisplayName(storedDisplayName || authDisplayName)
        setHobby(profile?.hobby ?? '')
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load profile.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, user])

  useEffect(() => {
    if (!toast.message) return
    const timer = setTimeout(() => {
      setToast({ type: '', message: '' })
    }, 2500)
    return () => clearTimeout(timer)
  }, [toast])

  if (!open) return null

  const handleSave = async (event) => {
    event.preventDefault()

    if (!user?.uid) {
      setToast({ type: 'error', message: 'Please sign in to save a profile.' })
      return
    }

    const trimmedDisplayName = displayName.trim()
    const trimmedHobby = hobby.trim()

    if (trimmedHobby.length > MAX_LENGTH) {
      setError(`Hobby must be ${MAX_LENGTH} characters or fewer.`)
      return
    }

    if (trimmedDisplayName.length > MAX_LENGTH) {
      setError(`Display name must be ${MAX_LENGTH} characters or fewer.`)
      return
    }

    setSaving(true)
    setError('')

    try {
      await saveUserProfile(user.uid, {
        displayName: trimmedDisplayName,
        hobby: trimmedHobby,
      })
      setToast({ type: 'success', message: 'Profile saved.' })
    } catch (err) {
      setToast({ type: 'error', message: err.message ?? 'Could not save profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 dark:bg-black/50"
        onClick={onClose}
        aria-label="Close profile"
      />

      <section className="relative z-10 w-full max-w-md rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-panel">
        <header className="px-4 py-3 border-b border-parchment-200 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-parchment-100 dark:bg-dark-bg flex items-center justify-center">
              <UserRound size={16} className="text-ink-muted dark:text-dark-muted" />
            </div>
            <h2 className="text-sm font-semibold text-ink dark:text-dark-text">Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
            aria-label="Close profile panel"
          >
            <X size={15} />
          </button>
        </header>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          {!user?.uid && (
            <p className="text-sm rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
              You are not signed in. Sign in to save profile details.
            </p>
          )}

          {error && (
            <p className="text-sm rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              {error}
            </p>
          )}

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-dark-muted">
              Display Name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_LENGTH}
              disabled={!user?.uid || loading || saving}
              className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage transition-colors disabled:opacity-60"
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-dark-muted">
              Hobby
            </span>
            <input
              type="text"
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              maxLength={MAX_LENGTH}
              disabled={!user?.uid || loading || saving}
              className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage transition-colors disabled:opacity-60"
              placeholder="Photography, chess, trail running..."
            />
            <p className="mt-1 text-xs text-ink-muted dark:text-dark-muted">{hobby.length}/{MAX_LENGTH}</p>
          </label>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!user?.uid || loading || saving}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-sage text-white hover:bg-sage-light disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>

        {toast.message && (
          <div className="px-4 pb-4">
            <div
              className={`text-sm rounded-md px-3 py-2 border ${
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
