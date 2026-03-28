import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock } from 'lucide-react'

function clampDigit(value = '') {
  return value.replace(/\D/g, '').slice(-1)
}

function emptyDigits() {
  return ['', '', '', '']
}

function digitsToPin(digits) {
  return digits.join('')
}

function PinBoxes({
  digits,
  setDigits,
  onComplete,
  autoFocus = true,
  shake = false,
  idPrefix = 'pin',
}) {
  const inputRefs = useRef([])

  useEffect(() => {
    if (!autoFocus) return
    inputRefs.current[0]?.focus()
  }, [autoFocus])

  const activeIndex = useMemo(() => {
    const firstEmpty = digits.findIndex((digit) => !digit)
    return firstEmpty === -1 ? 3 : firstEmpty
  }, [digits])

  const updateDigit = (index, value) => {
    const digit = clampDigit(value)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (next.every(Boolean)) {
      onComplete?.(digitsToPin(next))
    }
  }

  const moveFocus = (index) => {
    if (index < 0 || index > 3) return
    inputRefs.current[index]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        next[index - 1] = ''
        setDigits(next)
        moveFocus(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(index - 1)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(index + 1)
      return
    }

    if (event.key === 'Tab') return

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      updateDigit(index, event.key)
      return
    }

    if (event.key === 'Enter' && digits.every(Boolean)) {
      event.preventDefault()
      onComplete?.(digitsToPin(digits))
      return
    }

    event.preventDefault()
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return

    const next = emptyDigits()
    pasted.split('').forEach((digit, index) => {
      next[index] = digit
    })
    setDigits(next)

    const focusIndex = Math.min(pasted.length, 3)
    inputRefs.current[focusIndex]?.focus()

    if (pasted.length === 4) {
      onComplete?.(digitsToPin(next))
    }
  }

  return (
    <div className={`grid grid-cols-4 gap-3 justify-center ${shake ? 'animate-lock-shake' : ''}`}>
      {[0, 1, 2, 3].map((index) => (
        <input
          key={`${idPrefix}-${index}`}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[index]}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          className={`w-[60px] h-[72px] rounded-xl border text-center text-2xl font-semibold bg-white/90 dark:bg-dark-elevated text-ink dark:text-dark-text transition-all duration-150 outline-none ${
            activeIndex === index
              ? 'border-sage dark:border-sage-dark shadow-[0_0_0_3px_rgba(45,106,79,0.15)] dark:shadow-[0_0_0_3px_rgba(74,222,128,0.15)]'
              : 'border-parchment-200 dark:border-dark-border'
          }`}
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  )
}

export default function LockScreen({ mode = 'unlock', onSuccess, onCancel }) {
  const [pin, setPin] = useState(emptyDigits)
  const [confirmPin, setConfirmPin] = useState(emptyDigits)
  const [error, setError] = useState('')
  const [shakePin, setShakePin] = useState(false)

  const runShake = () => {
    setShakePin(true)
    setTimeout(() => setShakePin(false), 300)
  }

  const clearPins = () => {
    setPin(emptyDigits())
    setConfirmPin(emptyDigits())
  }

  const handleSetupSubmit = () => {
    const first = digitsToPin(pin)
    const second = digitsToPin(confirmPin)

    if (!/^\d{4}$/.test(first) || !/^\d{4}$/.test(second)) {
      setError('PIN must be exactly 4 digits.')
      runShake()
      return
    }

    if (first !== second) {
      setError('PIN values do not match.')
      runShake()
      return
    }

    localStorage.setItem('noteflow_master_pin', btoa(first))
    setError('')
    clearPins()
    onSuccess?.()
  }

  const handleUnlock = (candidate) => {
    const stored = localStorage.getItem('noteflow_master_pin')
    if (!stored || btoa(candidate) !== stored) {
      setError('Incorrect PIN')
      setPin(emptyDigits())
      runShake()
      return
    }

    setError('')
    onSuccess?.()
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 bg-parchment-50 dark:bg-dark-bg">
      <div className="w-full max-w-md rounded-2xl border border-parchment-200/80 dark:border-dark-border bg-white/85 dark:bg-dark-surface/90 backdrop-blur-xl p-6 md:p-8 text-center shadow-lg space-y-5 animate-scale-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-sage-pale dark:bg-sage-darkPale flex items-center justify-center animate-pulse-subtle">
          <Lock size={30} className="text-sage dark:text-sage-dark" />
        </div>

        {mode === 'setup' ? (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-ink dark:text-dark-text">Set a Master PIN</h2>
              <p className="text-sm text-ink-muted dark:text-dark-muted mt-1">This PIN will lock all your private notes</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-muted dark:text-dark-muted">Enter 4-digit PIN</p>
                <PinBoxes
                  digits={pin}
                  setDigits={setPin}
                  onComplete={() => {}}
                  shake={shakePin}
                  idPrefix="setup-pin"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-muted dark:text-dark-muted">Confirm PIN</p>
                <PinBoxes
                  digits={confirmPin}
                  setDigits={setConfirmPin}
                  onComplete={() => {}}
                  autoFocus={false}
                  shake={shakePin}
                  idPrefix="confirm-pin"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              onClick={handleSetupSubmit}
              className="w-full py-2.5 rounded-lg bg-sage text-white font-medium hover:bg-sage-light transition-colors"
            >
              Set PIN
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-ink dark:text-dark-text">Notes Locked</h2>
              <p className="text-sm text-ink-muted dark:text-dark-muted mt-1">Enter your PIN to access locked notes</p>
            </div>

            <PinBoxes
              digits={pin}
              setDigits={setPin}
              onComplete={handleUnlock}
              shake={shakePin}
              idPrefix="unlock-pin"
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-lg border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
