import { useState } from 'react'
import { ChevronRight, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useNotes } from '../../context/NoteContext'
import Button from '../UI/Button'

/**
 * UserProfile Component - Collapsible profile panel
 * Shows user stats and theme toggle
 */
export default function UserProfile({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const { notes } = useNotes()
  const [isExpanded, setIsExpanded] = useState(false)

  const totalWords = notes.reduce(
    (sum, note) => sum + (note.content?.split(/\s+/).length || 0),
    0
  )

  return (
    <div
      className={`fixed right-0 top-0 h-screen bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-dark-border transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-24'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full flex flex-col p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <ChevronRight
            size={20}
            className={`text-gray-400 dark:text-dark-muted transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* User Info */}
        <div
          className={`flex flex-col items-center gap-4 mb-8 transition-opacity ${
            isExpanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {user?.displayName?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-dark-text">
              {user?.displayName || 'User'}
            </p>
            <p className="text-sm text-gray-600 dark:text-dark-muted truncate max-w-xs">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {notes.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-dark-muted">Notes</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(totalWords / 1000)}K
              </p>
              <p className="text-xs text-gray-600 dark:text-dark-muted">Words</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isExpanded && (
          <div className="space-y-2 mb-8 flex-1">
            <Button
              variant="ghost"
              size="md"
              onClick={toggleTheme}
              icon={theme === 'light' ? Moon : Sun}
              iconPosition="left"
              className="w-full justify-start"
            >
              {theme === 'light' ? 'Dark' : 'Light'} Mode
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={Settings}
              iconPosition="left"
              className="w-full justify-start"
            >
              Settings
            </Button>
          </div>
        )}

        {/* Logout */}
        {isExpanded && (
          <Button
            variant="danger"
            size="md"
            onClick={onLogout}
            icon={LogOut}
            iconPosition="left"
            className="w-full justify-start"
          >
            Logout
          </Button>
        )}
      </div>
    </div>
  )
}
