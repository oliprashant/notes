import { Star, Trash2 } from 'lucide-react'
import { formatTimestamp, truncateText, getWordCount } from '../../utils/formatters'

/**
 * NoteCard Component - Displays a single note in list
 * Shows title, preview, date, and word count
 */
export default function NoteCard({
  note,
  isSelected,
  onSelect,
  onToggleStar,
  onDelete,
}) {
  return (
    <div
      onClick={() => onSelect(note.id)}
      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-l-4 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 shadow-md'
          : 'bg-white dark:bg-dark-surface border-transparent hover:bg-gray-50 dark:hover:bg-dark-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-dark-text truncate">
            {note.title || 'Untitled'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-dark-muted">
            {formatTimestamp(note.updatedAt)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(note.id)
          }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
        >
          <Star
            size={16}
            className={`transition-colors ${
              note.starred
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400 dark:text-dark-muted'
            }`}
          />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-dark-muted line-clamp-2 mb-2">
        {truncateText(note.content, 80) || 'No content'}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-dark-muted">
          {getWordCount(note.content)} words
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note.id)
          }}
          className="p-1 rounded text-gray-400 dark:text-dark-muted hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
