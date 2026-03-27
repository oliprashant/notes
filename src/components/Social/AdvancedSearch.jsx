import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Filter, Loader2, Search, Tag, UserCircle2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSearchAutocomplete, searchNotesAdvanced } from '../../firebase/socialService'
import { highlightText } from '../../utils/engagementHelpers'

const HISTORY_KEY = 'noteflow_search_history_v1'

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 8) : []
  } catch {
    return []
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)))
}

function mergeHistory(nextQuery, previous) {
  const normalized = nextQuery.trim()
  if (!normalized) return previous
  const deduped = [normalized, ...previous.filter((item) => item.toLowerCase() !== normalized.toLowerCase())]
  return deduped.slice(0, 8)
}

function matchSnippet(content = '', q = '') {
  const plain = String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) return ''
  if (!q?.trim()) return plain.slice(0, 180)
  const idx = plain.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return plain.slice(0, 180)
  const start = Math.max(0, idx - 40)
  const end = Math.min(plain.length, idx + 140)
  return `${start > 0 ? '... ' : ''}${plain.slice(start, end)}${end < plain.length ? ' ...' : ''}`
}

function Highlighted({ text, query, className }) {
  const chunks = highlightText(text || '', query || '')
  return (
    <span className={className}>
      {chunks.map((chunk, index) => (
        <span
          key={`${chunk.text}-${index}`}
          className={chunk.matched ? 'bg-yellow-200 dark:bg-yellow-900/60 rounded px-0.5' : ''}
        >
          {chunk.text}
        </span>
      ))}
    </span>
  )
}

export default function AdvancedSearch() {
  const [queryText, setQueryText] = useState('')
  const [sort, setSort] = useState('relevance')
  const [selectedTags, setSelectedTags] = useState([])
  const [authorUid, setAuthorUid] = useState('')
  const [authorLabel, setAuthorLabel] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const [history, setHistory] = useState(() => loadHistory())
  const [autocomplete, setAutocomplete] = useState({ users: [], tags: [] })

  const normalizedQuery = useMemo(() => queryText.trim(), [queryText])
  const canSearch = normalizedQuery.length >= 2 || selectedTags.length > 0 || Boolean(authorUid)

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setAutocomplete({ users: [], tags: [] })
      return undefined
    }

    const timer = setTimeout(async () => {
      try {
        const suggestions = await getSearchAutocomplete(normalizedQuery, 6)
        setAutocomplete(suggestions)
      } catch {
        setAutocomplete({ users: [], tags: [] })
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [normalizedQuery])

  const runSearch = async ({ append = false } = {}) => {
    if (!canSearch) {
      setResults([])
      return
    }

    const filters = {
      tags: selectedTags,
      authorUid: authorUid || null,
      dateRange: {
        from: dateFrom || null,
        to: dateTo || null,
      },
    }

    const activeCursor = append ? cursor : null
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const response = await searchNotesAdvanced({
        queryText: normalizedQuery,
        filters,
        sort,
        pageSize: 18,
        cursor: activeCursor,
      })

      if (append) {
        const deduped = new Map(results.map((item) => [item.id, item]))
        response.items.forEach((item) => deduped.set(item.id, item))
        setResults([...deduped.values()])
      } else {
        setResults(response.items)
      }

      setCursor(response.nextCursor)
      setHasMore(response.hasMore)

      if (!append && normalizedQuery) {
        const nextHistory = mergeHistory(normalizedQuery, history)
        setHistory(nextHistory)
        saveHistory(nextHistory)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const toggleTag = (tag) => {
    const normalized = tag.toLowerCase()
    setSelectedTags((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized)
      return [...prev, normalized]
    })
  }

  const clearAll = () => {
    setQueryText('')
    setSort('relevance')
    setSelectedTags([])
    setAuthorUid('')
    setAuthorLabel('')
    setDateFrom('')
    setDateTo('')
    setResults([])
    setHasMore(false)
    setCursor(null)
  }

  return (
    <div className="h-full overflow-y-auto bg-parchment-50 dark:bg-dark-bg p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold text-ink dark:text-dark-text">Advanced Search</h1>
          <p className="text-sm text-ink-muted dark:text-dark-muted">Search title, content, tags, and authors with filters and ranking.</p>
        </header>

        <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-ink-muted dark:text-dark-muted" />
            <input
              type="search"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runSearch({ append: false })
              }}
              placeholder="Search notes, tags, usernames..."
              className="flex-1 bg-transparent text-sm text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none"
            />
            <button
              type="button"
              onClick={() => runSearch({ append: false })}
              disabled={!canSearch || loading}
              className="px-3 py-1.5 rounded-md text-sm bg-sage text-white hover:bg-sage-light disabled:opacity-60"
            >
              Search
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <label className="inline-flex items-center gap-2 text-xs rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1.5 text-ink-muted dark:text-dark-muted">
              <Filter size={12} />
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="ml-auto bg-transparent outline-none text-ink dark:text-dark-text"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="mostLiked">Most liked</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-2 text-xs rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1.5 text-ink-muted dark:text-dark-muted">
              <CalendarRange size={12} />
              From
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="ml-auto bg-transparent outline-none text-ink dark:text-dark-text" />
            </label>

            <label className="inline-flex items-center gap-2 text-xs rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1.5 text-ink-muted dark:text-dark-muted">
              <CalendarRange size={12} />
              To
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="ml-auto bg-transparent outline-none text-ink dark:text-dark-text" />
            </label>

            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center justify-center gap-1 text-xs rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1.5 text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
            >
              <X size={12} />
              Clear
            </button>
          </div>

          {!!history.length && !normalizedQuery && (
            <div className="space-y-1">
              <p className="text-xs text-ink-muted dark:text-dark-muted">Recent searches</p>
              <div className="flex flex-wrap gap-1.5">
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQueryText(item)
                      runSearch({ append: false })
                    }}
                    className="px-2 py-1 rounded-md text-xs border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(autocomplete.users.length > 0 || autocomplete.tags.length > 0) && normalizedQuery.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="rounded-md border border-parchment-200 dark:border-dark-border p-2">
                <p className="text-xs text-ink-muted dark:text-dark-muted">User suggestions</p>
                <div className="mt-1 space-y-1">
                  {autocomplete.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setAuthorUid(user.id)
                        setAuthorLabel(user.username || user.displayName || 'user')
                      }}
                      className="w-full text-left text-xs rounded px-1.5 py-1 hover:bg-parchment-100 dark:hover:bg-dark-hover text-ink dark:text-dark-text"
                    >
                      @{user.username || 'user'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-parchment-200 dark:border-dark-border p-2">
                <p className="text-xs text-ink-muted dark:text-dark-muted">Tag suggestions</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {autocomplete.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${selectedTags.includes(tag) ? 'bg-sage text-white border-sage' : 'border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text'}`}
                    >
                      <Tag size={11} /> {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {authorUid && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-parchment-100 dark:bg-dark-hover text-ink dark:text-dark-text">
                Author: @{authorLabel || 'selected'}
                <button type="button" onClick={() => { setAuthorUid(''); setAuthorLabel('') }}>
                  <X size={11} />
                </button>
              </span>
            )}
            {selectedTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-parchment-100 dark:bg-dark-hover text-ink dark:text-dark-text">
                #{tag}
                <button type="button" onClick={() => toggleTag(tag)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </section>

        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-dark-muted">
            <Loader2 size={14} className="animate-spin" />
            Searching...
          </div>
        )}

        {!loading && results.length === 0 && canSearch && (
          <div className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 text-sm text-ink-muted dark:text-dark-muted">
            No results found.
          </div>
        )}

        <div className="space-y-2">
          {results.map((note) => (
            <article key={note.id} className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/shared/${note.id}`} className="text-sm font-semibold text-ink dark:text-dark-text hover:underline">
                    <Highlighted text={note.title || 'Untitled'} query={normalizedQuery} />
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted dark:text-dark-muted">
                    {note.createdAt?.toLocaleString?.() || 'Unknown date'}
                  </p>
                </div>
                <div className="text-xs text-ink-muted dark:text-dark-muted">
                  ❤ {Number(note.likeCount || 0)}
                </div>
              </div>

              <p className="mt-2 text-sm text-ink dark:text-dark-text">
                <Highlighted text={matchSnippet(note.content, normalizedQuery)} query={normalizedQuery} />
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Array.isArray(note.tags) ? note.tags : []).slice(0, 5).map((tag) => (
                  <button
                    key={`${note.id}-${tag}`}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="text-xs rounded border border-parchment-200 dark:border-dark-border px-2 py-0.5 text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
                  >
                    #{tag}
                  </button>
                ))}
                {note.ownerUsername && (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-muted dark:text-dark-muted">
                    <UserCircle2 size={11} /> @{note.ownerUsername}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {!loading && hasMore && (
          <button
            type="button"
            onClick={() => runSearch({ append: true })}
            disabled={loadingMore}
            className="px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
          >
            {loadingMore ? 'Loading more...' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
