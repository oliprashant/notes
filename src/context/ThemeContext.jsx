import { createContext, useContext, useState, useEffect } from 'react'

/**
 * ThemeContext - Manages dark/light mode theme
 * Supports system preference detection and localStorage persistence
 */
const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('noteflow-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (stored) {
      setTheme(stored)
    } else if (prefersDark) {
      setTheme('dark')
    }

    setMounted(true)
  }, [])

  // Update HTML class and localStorage when theme changes
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem('noteflow-theme', theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
