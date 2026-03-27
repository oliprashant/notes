import { useEffect, useRef, useState } from 'react'

/**
 * useAutoSave - Automatically save content with debouncing
 * Provides save status feedback (unsaved, saving, saved)
 */
export function useAutoSave(content, onSave, delay = 1000) {
  const [saveStatus, setSaveStatus] = useState('idle') // idle, saving, saved
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set status to unsaved
    setSaveStatus('unsaved')

    // Create new save timeout
    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await onSave(content)
        setSaveStatus('saved')
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('Auto-save error:', err)
        setSaveStatus('error')
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [content, onSave, delay])

  return { saveStatus }
}
