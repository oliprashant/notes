// src/components/Notes/NoteItem.jsx
// ──────────────────────────────────────────────────────────────
// Individual note entry in the sidebar list.
// Shows title, content preview, timestamp, and delete action.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Check, Lock, Pin, Star, Trash2 } from 'lucide-react'

/** Format a date as a human-readable relative string */
function formatDate(date) {
  if (!date) return ''
  const now    = new Date()
  const diff   = now - date
  const mins   = Math.floor(diff / 60000)
  const hours  = Math.floor(diff / 3600000)
  const days   = Math.floor(diff / 86400000)

  if (mins < 1)    return 'Just now'
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days < 7)    return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function stripHtml(text = '') {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function NoteItem({
  note,
  isSelected,
  onSelect,
  onDelete,
  onTogglePin,
  onToggleFavourite,
  onSelectTag,
  unlockedNoteIds = [],
  multiSelectMode = false,
  isBulkSelected = false,
  onToggleBulkSelect,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      // Auto-cancel after 3 s
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const isThisNoteUnlocked = unlockedNoteIds.includes(note.id)
  const isLocked = Boolean(note.locked && !isThisNoteUnlocked)
  const preview = stripHtml(note.content).slice(0, 100)
  const tags = (note.tags ?? []).slice(0, 3)
  const isPinned = Boolean(note.pinned)
  const isFavourite = Boolean(note.favourite)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (multiSelectMode) {
          onToggleBulkSelect?.(event)
          return
        }
        onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (multiSelectMode) {
          onToggleBulkSelect?.(event)
          return
        }
        onSelect()
      }}
      aria-selected={isSelected}
      aria-label={isLocked ? 'Note: Locked Note' : `Note: ${note.title}`}
      style={(!isLocked && note.color) ? { borderLeft: `3px solid ${note.color}` } : undefined}
      className={`
        group relative flex flex-col gap-0.5 p-3 rounded-xl cursor-pointer
        transition-all duration-150 outline-none
        ${multiSelectMode && isBulkSelected
          ? 'ring-2 ring-sage/50 bg-sage-pale/40 dark:bg-sage/10'
          : isSelected
          ? 'bg-white dark:bg-dark-elevated shadow-md'
          : 'hover:bg-white/70 dark:hover:bg-dark-elevated/70 hover:-translate-y-[1px]'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-[14px] font-medium truncate leading-snug inline-flex items-center gap-1.5
          ${isSelected ? 'text-ink dark:text-dark-text' : 'text-ink-light dark:text-dark-secondary'}`}>
          {multiSelectMode && (
            <span
              className={`w-4 h-4 rounded border inline-flex items-center justify-center transition-all duration-200 ${
                isBulkSelected
                  ? 'bg-sage border-sage text-white scale-100'
                  : 'border-parchment-300 dark:border-dark-border text-transparent scale-95'
              }`}
              aria-hidden="true"
            >
              <Check size={11} />
            </span>
          )}
          {!isLocked && note.locked && <Lock size={12} className="flex-shrink-0 text-ink-muted dark:text-dark-muted" aria-hidden="true" />}
          <span className="truncate">{isLocked ? '🔒 Locked Note' : (note.title || 'Untitled')}</span>
        </h3>

        {!multiSelectMode && <div className="flex items-center gap-0.5">
          {/* Favourite button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavourite?.(note.id, isFavourite)
            }}
            className={`flex-shrink-0 p-1 rounded transition-all duration-100
              ${isFavourite
                ? 'opacity-100 text-amber-500 dark:text-amber-400'
                : 'opacity-0 group-hover:opacity-100 text-ink-muted dark:text-dark-secondary hover:text-amber-500 dark:hover:text-amber-400'
              }`}
            aria-label={isFavourite ? 'Remove from starred' : 'Add to starred'}
            title={isFavourite ? 'Remove from starred' : 'Add to starred'}
          >
            <Star size={13} fill={isFavourite ? 'currentColor' : 'none'} />
          </button>

          {/* Pin button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin?.(note.id, isPinned)
            }}
            className={`flex-shrink-0 p-1 rounded transition-all duration-100
              ${isPinned
                ? 'opacity-100 text-sage dark:text-sage-dark'
                : 'opacity-0 group-hover:opacity-100 text-ink-muted dark:text-dark-secondary hover:text-sage dark:hover:text-sage-dark'
              }`}
            aria-label={isPinned ? 'Unpin note' : 'Pin note'}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={13} fill={isPinned ? 'currentColor' : 'none'} />
          </button>

          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            className={`flex-shrink-0 p-1 rounded transition-all duration-100
              opacity-0 group-hover:opacity-100
              ${confirmDelete
                ? 'text-red-500 opacity-100'
                : 'text-ink-muted dark:text-dark-muted hover:text-red-400'
              }`}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete note'}
            title={confirmDelete ? 'Click again to confirm' : 'Delete note'}
          >
            <Trash2 size={13} />
          </button>
        </div>}
      </div>

      {!isLocked && note?.summary ? (
        <p className="text-xs italic text-ink-muted dark:text-dark-muted line-clamp-2 leading-relaxed">
          {note.summary}
        </p>
      ) : (
        !isLocked && preview && (
          <p className="text-xs text-ink-muted dark:text-dark-muted line-clamp-2 leading-relaxed">
            {preview}
          </p>
        )
      )}

      {!multiSelectMode && !isLocked && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.stopPropagation()
                onSelectTag?.(tag)
              }}
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sage-pale text-sage dark:bg-sage/20 dark:text-sage-light hover:bg-sage/25 transition-colors"
              title={`Filter by ${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <time
        className="text-[11px] text-ink-muted/70 dark:text-dark-muted/80 mt-1"
        dateTime={note.updatedAt?.toISOString?.()}
      >
        {isLocked && <span className="font-medium">🔒 Locked </span>}
        {formatDate(note.updatedAt)}
      </time>
    </article>
  )
}
