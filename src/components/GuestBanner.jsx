import { X } from 'lucide-react'

export default function GuestBanner({ onSignUp, onSignIn, onDismiss }) {
  return (
    <div className="px-4 py-2 bg-amber-100/90 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <p className="text-xs sm:text-sm flex-1">
          You're in guest mode - notes may be lost when you sign out
        </p>
        <button
          type="button"
          onClick={onSignUp}
          className="px-2.5 py-1.5 text-xs rounded-md bg-sage text-white hover:bg-sage-light transition-colors"
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="px-2.5 py-1.5 text-xs rounded-md border border-amber-400/70 dark:border-amber-700 hover:bg-amber-200/70 dark:hover:bg-amber-900/40 transition-colors"
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-amber-200/70 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="Dismiss guest banner"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
