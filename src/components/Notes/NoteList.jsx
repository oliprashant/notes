// src/components/Notes/NoteList.jsx
// ──────────────────────────────────────────────────────────────
// Sidebar note list with new note button and individual items.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react'
import { CheckSquare, Copy, Lock, Pin, Plus, RotateCcw, Share2, Square, Star, Trash2, X } from 'lucide-react'
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
  onBulkShare,
  onBulkDelete,
  onBulkDuplicate,
  onBulkToggleLock,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)

  const uniqueTags = [...new Set((allNotes ?? []).flatMap(note => note.tags ?? []))]

  const visibleNotes = activeFilter === 'starred'
    ? notes.filter(note => note.favourite)
    : notes

  const pinnedNotes = visibleNotes.filter(note => note.pinned)
  const regularNotes = visibleNotes.filter(note => !note.pinned)
  const orderedVisibleIds = [...pinnedNotes, ...regularNotes].map((note) => note.id)

  const exitMultiSelect = () => {
    setMultiSelectMode(false)
    setSelectedIds([])
    setLastSelectedIndex(null)
  }

  const toggleMode = () => {
    if (multiSelectMode) {
      exitMultiSelect()
      return
    }
    setMultiSelectMode(true)
  }

  const handleSelectOne = (noteId, index, event) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (event?.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        const rangeIds = orderedVisibleIds.slice(start, end + 1)
        const shouldSelectRange = !next.has(noteId)
        rangeIds.forEach((id) => {
          if (shouldSelectRange) {
            next.add(id)
          } else {
            next.delete(id)
          }
        })
      } else if (next.has(noteId)) {
        next.delete(noteId)
      } else {
        next.add(noteId)
      }
      return Array.from(next)
    })
    setLastSelectedIndex(index)
  }

  const allVisibleSelected = orderedVisibleIds.length > 0 && orderedVisibleIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([])
      return
    }
    setSelectedIds(orderedVisibleIds)
  }

  const runBulkAction = async (action) => {
    if (selectedIds.length === 0) return
    await action?.(selectedIds)
    exitMultiSelect()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* New note button */}
      <div className="p-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3
                      bg-sage dark:bg-sage-dark text-white text-sm font-medium rounded-xl
                      hover:bg-sage-light dark:hover:bg-sage-darkHover hover:scale-[1.01]
                      transition-all duration-150 shadow-md"
            aria-label="Create new note"
          >
            <Plus size={16} />
            New note
          </button>

          <button
            type="button"
            onClick={toggleMode}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-xl transition-all duration-200 ${
              multiSelectMode
                ? 'bg-parchment-200 dark:bg-dark-hover text-ink dark:text-dark-text'
                : 'bg-white/80 dark:bg-dark-elevated/80 text-ink dark:text-dark-text hover:bg-white dark:hover:bg-dark-surface'
            }`}
            aria-label={multiSelectMode ? 'Exit select mode' : 'Enter select mode'}
          >
            {multiSelectMode ? <X size={15} /> : <CheckSquare size={15} />}
            {multiSelectMode ? 'Done' : 'Select'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2">
        <div className="inline-flex w-full p-1 rounded-xl bg-white/70 dark:bg-dark-elevated/70">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors
              ${activeFilter === 'all'
                ? 'bg-white dark:bg-dark-surface text-ink dark:text-dark-text shadow-sm'
                : 'text-ink-muted dark:text-dark-secondary hover:text-ink dark:hover:text-dark-text'
              }`}
            aria-pressed={activeFilter === 'all'}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center justify-center gap-1.5
              ${activeFilter === 'starred'
                ? 'bg-white dark:bg-dark-surface text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-ink-muted dark:text-dark-secondary hover:text-amber-600 dark:hover:text-amber-400'
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
        className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5"
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
            <div className="px-2 pt-1 pb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted dark:text-dark-muted">
              <Pin size={11} />
              Pinned
            </div>
            {pinnedNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedId}
                onSelect={() => {
                  if (multiSelectMode) return
                  onSelect(note.id)
                }}
                onDelete={() => onDelete(note.id)}
                onSelectTag={onSelectTag}
                onTogglePin={onTogglePin}
                onToggleFavourite={onToggleFavourite}
                unlockedNoteIds={unlockedNoteIds}
                multiSelectMode={multiSelectMode}
                isBulkSelected={selectedIds.includes(note.id)}
                onToggleBulkSelect={(event) => handleSelectOne(note.id, orderedVisibleIds.indexOf(note.id), event)}
              />
            ))}
          </>
        )}

        {!loading && regularNotes.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted dark:text-dark-muted">
              Notes
            </div>
            {regularNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedId}
                onSelect={() => {
                  if (multiSelectMode) return
                  onSelect(note.id)
                }}
                onDelete={() => onDelete(note.id)}
                onSelectTag={onSelectTag}
                onTogglePin={onTogglePin}
                onToggleFavourite={onToggleFavourite}
                unlockedNoteIds={unlockedNoteIds}
                multiSelectMode={multiSelectMode}
                isBulkSelected={selectedIds.includes(note.id)}
                onToggleBulkSelect={(event) => handleSelectOne(note.id, orderedVisibleIds.indexOf(note.id), event)}
              />
            ))}
          </>
        )}
      </nav>

      {multiSelectMode && (
        <div className="sticky bottom-0 z-20 px-3 pb-3 animate-fade-up">
          <div className="rounded-2xl border border-parchment-200 dark:border-dark-border bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl p-3 shadow-panel space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted dark:text-dark-muted">
                {selectedIds.length} selected
              </p>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-parchment-100 dark:hover:bg-dark-hover text-ink dark:text-dark-text transition-colors"
              >
                {allVisibleSelected ? <Square size={12} /> : <CheckSquare size={12} />}
                {allVisibleSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => runBulkAction(onBulkShare)}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-parchment-200 dark:border-dark-border text-xs text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Share2 size={12} />
                Share
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => runBulkAction(onBulkDuplicate)}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-parchment-200 dark:border-dark-border text-xs text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Copy size={12} />
                Duplicate
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => runBulkAction(onBulkToggleLock)}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-parchment-200 dark:border-dark-border text-xs text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Lock size={12} />
                Lock/Unlock
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => runBulkAction(onBulkDelete)}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash button */}
      <div className={`p-3 mt-auto transition-all duration-200 ${multiSelectMode ? 'pb-1' : ''}`}>
        <button
          onClick={onOpenTrash}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-xl
                     text-ink-muted dark:text-dark-secondary bg-white/70 dark:bg-dark-elevated/70
                     hover:bg-white dark:hover:bg-dark-surface transition-all duration-150"
          aria-label="Open trash"
        >
          <Trash2 size={15} />
          Trash ({trashedNotes.length})
        </button>
      </div>

      {trashOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-xl" onClick={onCloseTrash} />
          <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-parchment-200/70 dark:border-dark-border bg-white/95 dark:bg-dark-surface/95 shadow-lg animate-scale-in">
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
