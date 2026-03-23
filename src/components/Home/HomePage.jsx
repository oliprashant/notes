import { ArrowRight, Lock, Pin, Star } from 'lucide-react'

function stripHtmlToText(html = '') {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function getWordCount(text = '') {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function notePreview(content = '', max = 120) {
  const text = stripHtmlToText(content)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export default function HomePage({
  notes,
  user,
  onSelectNote,
  onNewNote,
  onBrowseAll,
  onTogglePin,
  onToggleFavourite,
  unlockedNoteIds = [],
}) {
  const greeting = getGreeting()
  const todayText = formatToday()
  const firstName = (user?.displayName || 'there').split(' ')[0]

  const pinnedNotes = notes.filter((note) => note.pinned)
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const totalWords = notes.reduce((sum, note) => sum + getWordCount(stripHtmlToText(note.content ?? '')), 0)
  const starredCount = notes.filter((note) => note.favourite).length

  return (
    <div className="h-full overflow-y-auto px-4 md:px-8 py-8 md:py-10 animate-fade-in font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <section className="space-y-1.5">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink dark:text-dark-text">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-ink-muted dark:text-dark-muted">
            {todayText} · {notes.length} notes
          </p>
        </section>

        <section className="pt-1 pb-4 border-b border-parchment-200/80 dark:border-dark-border/80">
          <p className="text-sm text-ink-muted dark:text-dark-muted flex flex-wrap items-center gap-2">
            <span>{notes.length} notes</span>
            <span className="text-ink-muted/60 dark:text-dark-muted/60">|</span>
            <span>{totalWords} words</span>
            <span className="text-ink-muted/60 dark:text-dark-muted/60">|</span>
            <span>{pinnedNotes.length} pinned</span>
            <span className="text-ink-muted/60 dark:text-dark-muted/60">|</span>
            <span>{starredCount} starred</span>
          </p>
        </section>

        {pinnedNotes.length > 0 && (
          <section className="space-y-3 pt-1">
            <h2 className="text-sm font-medium text-ink-muted dark:text-dark-muted inline-flex items-center gap-2">
              <Pin size={14} />
              Pinned
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {pinnedNotes.map((note) => {
                const isThisNoteUnlocked = unlockedNoteIds.includes(note.id)
                const hiddenLocked = note.locked && !isThisNoteUnlocked
                return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectNote(note.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group relative min-w-[180px] text-left rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:shadow-sm transition-shadow overflow-hidden"
                >
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin?.(note.id, note.pinned)
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                      aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                      title={note.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={13} className={note.pinned ? 'text-sage fill-sage' : 'text-ink-muted dark:text-dark-muted'} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavourite?.(note.id, note.favourite)
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                      aria-label={note.favourite ? 'Unstar note' : 'Star note'}
                      title={note.favourite ? 'Unstar' : 'Star'}
                    >
                      <Star size={13} className={note.favourite ? 'text-amber-500 fill-amber-500' : 'text-ink-muted dark:text-dark-muted'} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectNote(note.id)
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                      aria-label="Open note"
                      title="Open"
                    >
                      <ArrowRight size={13} className="text-ink-muted dark:text-dark-muted" />
                    </button>
                  </div>
                  <div className="flex items-center">
                    {!hiddenLocked && <div className="w-1.5 h-12 rounded-l-lg" style={{ backgroundColor: note.color || '#A3B18A' }} />}
                    <p className="px-3 py-3 pr-24 text-sm font-medium text-ink dark:text-dark-text line-clamp-1 inline-flex items-center gap-1.5">
                      {hiddenLocked ? (
                        <>
                          <Lock size={12} className="flex-shrink-0 text-ink-muted dark:text-dark-muted" aria-hidden="true" />
                          <span className="line-clamp-1">🔒 Locked Note</span>
                        </>
                      ) : (
                        <>
                          {note.locked && <Lock size={12} className="flex-shrink-0 text-ink-muted dark:text-dark-muted" aria-hidden="true" />}
                          <span className="line-clamp-1">{note.title || 'Untitled'}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="space-y-3 pt-1 border-t border-parchment-200/80 dark:border-dark-border/80">
          <h2 className="pt-4 text-sm font-medium text-ink-muted dark:text-dark-muted">Recent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentNotes.map((note) => {
              const isThisNoteUnlocked = unlockedNoteIds.includes(note.id)
              const hiddenLocked = note.locked && !isThisNoteUnlocked
              return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectNote(note.id)
                  }
                }}
                role="button"
                tabIndex={0}
                className="group relative text-left rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:shadow-sm transition-shadow overflow-hidden"
              >
                <div className="absolute top-2 right-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePin?.(note.id, note.pinned)
                    }}
                    className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                    title={note.pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={13} className={note.pinned ? 'text-sage fill-sage' : 'text-ink-muted dark:text-dark-muted'} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavourite?.(note.id, note.favourite)
                    }}
                    className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                    aria-label={note.favourite ? 'Unstar note' : 'Star note'}
                    title={note.favourite ? 'Unstar' : 'Star'}
                  >
                    <Star size={13} className={note.favourite ? 'text-amber-500 fill-amber-500' : 'text-ink-muted dark:text-dark-muted'} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectNote(note.id)
                    }}
                    className="w-7 h-7 rounded-full bg-white/90 dark:bg-dark-surface/90 border border-parchment-200 dark:border-dark-border inline-flex items-center justify-center"
                    aria-label="Open note"
                    title="Open"
                  >
                    <ArrowRight size={13} className="text-ink-muted dark:text-dark-muted" />
                  </button>
                </div>
                <div className="flex min-h-[86px]">
                  {!hiddenLocked && <div className="w-1.5 rounded-l-lg" style={{ backgroundColor: note.color || 'transparent' }} />}
                  <div className="flex-1 p-3 space-y-1.5">
                    <p className="font-medium text-ink dark:text-dark-text line-clamp-1 pr-24 inline-flex items-center gap-1.5">
                      {hiddenLocked ? (
                        <>
                          <Lock size={12} className="flex-shrink-0 text-ink-muted dark:text-dark-muted" aria-hidden="true" />
                          <span className="line-clamp-1">🔒 Locked Note</span>
                        </>
                      ) : (
                        <>
                          {note.locked && <Lock size={12} className="flex-shrink-0 text-ink-muted dark:text-dark-muted" aria-hidden="true" />}
                          <span className="line-clamp-1">{note.title || 'Untitled'}</span>
                        </>
                      )}
                    </p>
                    {!hiddenLocked && (
                      <p className="text-sm text-ink-muted dark:text-dark-muted line-clamp-2">
                        {notePreview(note.content, 130) || 'No content yet'}
                      </p>
                    )}
                    <p className="text-xs text-right text-ink-muted dark:text-dark-muted pt-1">
                      {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : 'Recently updated'}
                    </p>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </section>

        <section className="pt-2 border-t border-parchment-200/80 dark:border-dark-border/80">
          <div className="pt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNewNote}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sage text-white hover:bg-sage-light transition-colors"
            >
              <span className="text-base leading-none">+</span>
              New Note
            </button>
            <button
              onClick={onBrowseAll}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
            >
              Browse All Notes
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
