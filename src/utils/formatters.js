/**
 * formatters.js - Utility functions for formatting dates, word counts, etc.
 */

/**
 * Format date relative to now (e.g., "2 hours ago", "just now")
 */
export function formatTimestamp(date) {
  if (!date) return 'Never'

  const now = new Date()
  const noteDate = new Date(date)
  const diffMs = now - noteDate
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 30) return 'Just now'
  if (diffMins < 1) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return noteDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: noteDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Format date as readable string (e.g., "Mar 27, 2026")
 */
export function formatDate(date) {
  if (!date) return ''

  const noteDate = new Date(date)
  return noteDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format time (e.g., "2:30 PM")
 */
export function formatTime(date) {
  if (!date) return ''

  const noteDate = new Date(date)
  return noteDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    meridiem: 'short',
  })
}

/**
 * Get word count from text
 */
export function getWordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).length
}

/**
 * Get character count
 */
export function getCharCount(text) {
  if (!text) return 0
  return text.length
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Get reading time (estimate minutes to read)
 */
export function getReadingTime(text) {
  const wordCount = getWordCount(text)
  const minutesToRead = Math.ceil(wordCount / 200) // Average 200 words per minute
  return `${minutesToRead} min read`
}

/**
 * Format large numbers (e.g., 1500 -> "1.5K")
 */
export function formatNumber(num) {
  if (num < 1000) return num.toString()
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K'
  return (num / 1000000).toFixed(1) + 'M'
}
