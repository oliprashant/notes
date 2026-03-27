import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'

/**
 * SearchBar Component - Debounced search input
 * Supports placeholder, clearing, and custom onChange
 */
export default function SearchBar({
  placeholder = 'Search notes...',
  onSearch,
  debounceDelay = 300,
  clearable = true,
}) {
  const [value, setValue] = useState('')
  const debouncedValue = useDebounce(value, debounceDelay)

  // Trigger search when debounced value changes
  const handleChange = (e) => {
    setValue(e.target.value)
  }

  const handleClear = () => {
    setValue('')
  }

  // Call onSearch when debounced value changes
  const handleDebouncedSearch = () => {
    if (onSearch) {
      onSearch(debouncedValue)
    }
  }

  // Trigger search on debounced value change
  if (value !== debouncedValue && onSearch) {
    handleDebouncedSearch()
  }

  return (
    <div className="relative flex items-center">
      <Search
        size={18}
        className="absolute left-3 text-gray-400 dark:text-dark-muted pointer-events-none"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-shadow"
      />
      {clearable && value && (
        <button
          onClick={handleClear}
          className="absolute right-3 p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-400 dark:text-dark-muted transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
