import { useMemo, useRef, useState } from 'react'
import { Lock } from 'lucide-react'

function getDigits(value = '') {
  return value.replace(/\D/g, '').slice(0, 4)
}

export default function NoteLock({ note, onUnlock, onDelete }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRefs = useRef([])

  const pinBoxes = useMemo(() => {
    const chars = pin.split('')
    return [0, 1, 2, 3].map((index) => chars[index] ?? '')
  }, [pin])

  const verifyPin = (candidate) => {
    if (!note?.pinHash) return false
    try {
      return btoa(candidate) === note.pinHash
    } catch {
      return false
    }
  }

  const failUnlock = () => {
    setError('Incorrect PIN')
    setShake(true)
    setTimeout(() => setShake(false), 360)
  }

  const submitUnlock = () => {
    if (pin.length !== 4) return
    if (!verifyPin(pin)) {
      failUnlock()
      return
    }
    setError('')
    onUnlock?.(note.id)
  }

  const handleHiddenInputChange = (event) => {
    const next = getDigits(event.target.value)
    setPin(next)
    setError('')

    const focusIndex = Math.min(next.length, 3)
    inputRefs.current[focusIndex]?.focus()

    if (next.length === 4) {
      setTimeout(submitUnlock, 10)
    }
  }

  const handleBoxKeyDown = (event, index) => {
    if (event.key === 'Backspace' && pin.length > 0 && index <= pin.length - 1) {
      const next = pin.slice(0, -1)
      setPin(next)
      setError('')
      const focusIndex = Math.max(next.length, 0)
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0)
      event.preventDefault()
      return
    }

    if (/^[0-9]$/.test(event.key)) {
      const next = getDigits(`${pin}${event.key}`)
      setPin(next)
      setError('')
      const focusIndex = Math.min(next.length, 3)
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0)
      if (next.length === 4) {
        setTimeout(() => {
          if (verifyPin(next)) {
            onUnlock?.(note.id)
          } else {
            failUnlock()
          }
        }, 10)
      }
      event.preventDefault()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      submitUnlock()
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 bg-parchment-50 dark:bg-dark-bg">
      <div className={`w-full max-w-sm rounded-2xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-6 md:p-8 text-center shadow-panel ${shake ? 'animate-lock-shake' : ''}`}>
        <div className="w-16 h-16 mx-auto rounded-full bg-sage-pale dark:bg-sage/20 flex items-center justify-center mb-4">
          <Lock size={30} className="text-sage" />
        </div>

        <h2 className="text-xl font-semibold text-ink dark:text-dark-text">This note is locked</h2>
        <p className="text-sm text-ink-muted dark:text-dark-muted mt-1">Enter your PIN to unlock</p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={pin}
          onChange={handleHiddenInputChange}
          className="sr-only"
          aria-hidden="true"
        />

        <div className="mt-5 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              value={pinBoxes[index]}
              onChange={() => {}}
              onKeyDown={(event) => handleBoxKeyDown(event, index)}
              onFocus={() => {
                if (index > pin.length) {
                  inputRefs.current[Math.min(pin.length, 3)]?.focus()
                }
              }}
              className="w-full h-12 rounded-lg border border-parchment-200 dark:border-dark-border bg-parchment-50 dark:bg-dark-bg text-center text-lg font-semibold text-ink dark:text-dark-text outline-none focus:border-sage"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="button"
          onClick={submitUnlock}
          className="mt-5 w-full py-2.5 rounded-lg bg-sage text-white font-medium hover:bg-sage-light transition-colors"
        >
          Unlock
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this locked note? This moves it to trash.')) {
              onDelete?.(note.id)
            }
          }}
          className="mt-4 text-xs text-ink-muted dark:text-dark-muted hover:text-red-500 transition-colors"
        >
          Forgot PIN? Delete note
        </button>
      </div>
    </div>
  )
}
