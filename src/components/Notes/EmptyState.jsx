import { BookOpen } from 'lucide-react'
import Button from '../UI/Button'

/**
 * EmptyState Component - Shows when no notes exist
 * Displays helpful message and action button
 */
export default function EmptyState({ onCreateNote }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-6 p-4 rounded-full bg-blue-100 dark:bg-blue-900/20">
        <BookOpen size={32} className="text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
        No notes yet
      </h3>
      <p className="text-gray-600 dark:text-dark-muted mb-6 max-w-sm">
        Create your first note to get started. You can organize, search, and share
        all your thoughts in one place.
      </p>
      <Button variant="primary" size="md" onClick={onCreateNote}>
        + Create New Note
      </Button>
    </div>
  )
}
