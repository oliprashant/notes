// src/components/Notes/NoteList.jsx
// ──────────────────────────────────────────────────────────────
// Sidebar note list with new note button and individual items.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Pin, Plus, RotateCcw, Star, Trash2 } from 'lucide-react'
import NoteItem from './NoteItem'

function formatDeletedDate(date) {
  if (!date) return 'Unknown date'
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function NoteList({
  notes,
  allNotes = notes,
  trashedNotes = [],
  selectedId,
  selectedTag,
  loading,
  onSelect,
  onSelectTag,
  onNew,
  onDelete,
  onUpdateTags,
  onRestore,
  onPermanentDelete,
  trashOpen,
  onOpenTrash,
  onCloseTrash,
  onTogglePin,
  onToggleFavourite,
  unlockedNoteIds = [],
}) {
  const [activeFilter, setActiveFilter] = useState('all')

  const uniqueTags = [...new Set((allNotes ?? []).flatMap(note => note.tags ?? []))]

  const visibleNotes = activeFilter === 'starred'
    ? notes.filter(note => note.favourite)
    : notes

  const pinnedNotes = visibleNotes.filter(note => note.pinned)
  const regularNotes = visibleNotes.filter(note => !note.pinned)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* New note button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 py-2 px-3
                     bg-sage text-white text-sm font-medium rounded-lg
                     hover:bg-sage-light transition-colors shadow-note"
          aria-label="Create new note"
        >
          <Plus size={16} />
          New note
        </button>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-2 p-1 rounded-lg bg-parchment-200 dark:bg-dark-hover border border-parchment-200 dark:border-dark-border">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors
              ${activeFilter === 'all'
                ? 'bg-white dark:bg-dark-surface text-ink dark:text-dark-text shadow-note'
                : 'text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text'
              }`}
            aria-pressed={activeFilter === 'all'}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center justify-center gap-1.5
              ${activeFilter === 'starred'
                ? 'bg-white dark:bg-dark-surface text-amber-600 dark:text-amber-400 shadow-note'
                : 'text-ink-muted dark:text-dark-muted hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            aria-pressed={activeFilter === 'starred'}
          >
            <Star size={12} />
            Starred
          </button>
        </div>
      </div>

      {/* Tag filters */}
      {uniqueTags.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {uniqueTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag?.(tag)}
                className={`px-2 py-1 text-[11px] rounded-full border transition-colors
                  ${selectedTag === tag
                    ? 'bg-sage text-white border-sage'
                    : 'bg-sage-pale dark:bg-sage/20 text-sage dark:text-sage-light border-transparent hover:bg-sage/25'
                  }`}
              >
                {tag}
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => onSelectTag?.(null)}
                className="px-2 py-1 text-[11px] rounded-full border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
                title="Clear tag filter"
              >
                x
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <nav
        className="flex-1 overflow-y-auto px-2 pb-4 space-y-1"
        aria-label="Notes list"
      >
        {loading && (
          <div className="py-8 text-center text-sm text-ink-muted">
            <div className="w-5 h-5 border-2 border-ink-muted border-t-transparent
                            rounded-full animate-spin mx-auto mb-2" />
            Loading notes…
          </div>
        )}

        {!loading && visibleNotes.length === 0 && (
          <div className="py-12 px-4 text-center">
            <p className="text-sm text-ink-muted dark:text-dark-muted mb-1">
              {activeFilter === 'starred' ? 'No starred notes' : 'No notes yet'}
            </p>
            <p className="text-xs text-ink-muted/70 dark:text-dark-muted/80">
              {activeFilter === 'starred' ? 'Star a note to see it here.' : 'Create your first note above.'}
            </p>
          </div>
        )}

        {!loading && pinnedNotes.length > 0 && (
          <>
            <div className="px-2 pt-1 pb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage dark:text-sage-light">
              <Pin size={11} />
              Pinned
            </div>
            {pinnedNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedId}
                onSelect={() => onSelect(note.id)}
                onDelete={() => onDelete(note.id)}
                onSelectTag={onSelectTag}
                onTogglePin={onTogglePin}
                onToggleFavourite={onToggleFavourite}
                unlockedNoteIds={unlockedNoteIds}
              />
            ))}
          </>
        )}

        {!loading && regularNotes.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted dark:text-dark-muted">
              Notes
            </div>
            {regularNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedId}
                onSelect={() => onSelect(note.id)}
                onDelete={() => onDelete(note.id)}
                onSelectTag={onSelectTag}
                onTogglePin={onTogglePin}
                onToggleFavourite={onToggleFavourite}
                unlockedNoteIds={unlockedNoteIds}
              />
            ))}
          </>
        )}
      </nav>

      {/* Trash button */}
      <div className="p-3 border-t border-parchment-200 dark:border-dark-border">
        <button
          onClick={onOpenTrash}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg
                     text-ink-muted dark:text-dark-muted border border-parchment-200 dark:border-dark-border
                     hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
          aria-label="Open trash"
        >
          <Trash2 size={15} />
          Trash ({trashedNotes.length})
        </button>
      </div>

      {trashOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 dark:bg-black/50" onClick={onCloseTrash} />
          <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-panel">
            <div className="px-4 py-3 border-b border-parchment-200 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink dark:text-dark-text">Trash</h3>
              <button
                onClick={onCloseTrash}
                className="px-2 py-1 text-xs rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
              >
                Close
              </button>
            </div>

            <div className="p-3 overflow-y-auto max-h-[60vh] space-y-2">
              {trashedNotes.length === 0 ? (
                <p className="text-sm text-ink-muted dark:text-dark-muted text-center py-8">Trash is empty.</p>
              ) : (
                trashedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border bg-parchment-50 dark:bg-dark-bg"
                  >
                    <p className="text-sm font-medium text-ink dark:text-dark-text truncate">
                      {note.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-ink-muted dark:text-dark-muted mt-1">
                      Deleted {formatDeletedDate(note.deletedAt)}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onRestore?.(note.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-sage text-white hover:bg-sage-light transition-colors"
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this note forever? This cannot be undone.')) {
                            onPermanentDelete?.(note.id)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
