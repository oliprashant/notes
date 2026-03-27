import { useState, useEffect } from 'react'

/**
 * useDebounce - Debounces a value and returns the debounced value
 * Useful for search inputs, resize handlers, etc.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
