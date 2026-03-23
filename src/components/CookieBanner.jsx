// src/components/CookieBanner.jsx
// ──────────────────────────────────────────────────────────────
// GDPR-compliant cookie consent banner.
// Stored in localStorage — won't re-appear after user chooses.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'noteflow_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show banner only if user hasn't chosen yet
    const choice = localStorage.getItem(STORAGE_KEY)
    if (!choice) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    // Decline — essential auth cookies still function, non-essential tracking disabled
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
    // In a real app: disable analytics, marketing scripts here
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50
                 bg-white border border-parchment-200 rounded-2xl shadow-panel
                 p-4 animate-slide-up"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-parchment-100 flex items-center justify-center flex-shrink-0">
          <Cookie size={16} className="text-ink-muted" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink mb-1">We use cookies</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            We use essential cookies for authentication and your session.
            No advertising or tracking cookies are used.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 py-2 text-xs font-medium text-ink-muted
                     bg-parchment-100 rounded-lg hover:bg-parchment-200 transition-colors"
          aria-label="Decline non-essential cookies"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="flex-1 py-2 text-xs font-medium text-white
                     bg-sage rounded-lg hover:bg-sage-light transition-colors"
          aria-label="Accept cookies"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
