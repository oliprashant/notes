import { useMemo, useState } from 'react'
import { Loader2, MessageCircle, Trash2 } from 'lucide-react'
import { addComment, deleteComment, getCommentsPage } from '../../firebase/socialService'

function formatDate(date) {
  if (!date) return 'Now'
  const ts = new Date(date).getTime()
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function CommentSection({ note, currentUser, onCountChanged }) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [text, setText] = useState('')

  const effectiveCount = useMemo(() => {
    const noteCount = Number(note.commentCount || 0)
    return Math.max(noteCount, comments.length)
  }, [comments.length, note.commentCount])

  const loadInitial = async () => {
    if (loading || loaded) return
    setLoading(true)
    try {
      const page = await getCommentsPage({ noteId: note.id, pageSize: 20 })
      setComments(page.items)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
      setLoaded(true)
      onCountChanged?.(Math.max(Number(note.commentCount || 0), page.items.length))
    } catch (error) {
      console.warn('Comment load failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || !cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await getCommentsPage({ noteId: note.id, pageSize: 20, cursor })
      setComments((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (error) {
      console.warn('Comment pagination failed:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const submitComment = async () => {
    if (!currentUser?.uid || !text.trim()) return
    if (effectiveCount >= 500) return
    setSubmitting(true)
    try {
      await addComment({
        noteId: note.id,
        currentUid: currentUser.uid,
        noteOwnerUid: note.uid,
        text,
        parentId: null,
        actor: {
          displayName: currentUser.displayName || '',
          username: currentUser.username || '',
          photoURL: currentUser.photoURL || '',
        },
      })

      const optimistic = {
        id: `temp_${Date.now()}`,
        uid: currentUser.uid,
        text: text.trim(),
        authorDisplayName: currentUser.displayName || currentUser.username || 'You',
        createdAt: new Date(),
      }

      setComments((prev) => [optimistic, ...prev])
      setText('')
      onCountChanged?.(Math.max(effectiveCount + 1, comments.length + 1))
      setLoaded(true)
    } catch (error) {
      console.warn('Comment submit failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (commentId) => {
    if (!currentUser?.uid) return
    try {
      await deleteComment({
        noteId: note.id,
        commentId,
        currentUid: currentUser.uid,
      })
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
      onCountChanged?.(Math.max(0, effectiveCount - 1))
    } catch (error) {
      console.warn('Comment delete failed:', error)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink dark:text-dark-text">Comments ({effectiveCount})</h4>
        {!loaded && (
          <button
            type="button"
            onClick={loadInitial}
            className="inline-flex items-center gap-1 rounded-md border border-parchment-200 dark:border-dark-border px-2.5 py-1 text-xs text-ink dark:text-dark-text"
          >
            <MessageCircle size={12} />
            View comments
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2 max-h-72 overflow-auto pr-1">
        {loading && (
          <div className="inline-flex items-center gap-2 text-xs text-ink-muted dark:text-dark-muted">
            <Loader2 size={12} className="animate-spin" />
            Loading comments...
          </div>
        )}

        {loaded && !loading && comments.length === 0 && (
          <p className="text-xs text-ink-muted dark:text-dark-muted">No comments yet.</p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md border border-parchment-200 dark:border-dark-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-ink dark:text-dark-text">
                {comment.authorDisplayName || 'User'}
                <span className="ml-1 text-ink-muted dark:text-dark-muted">{formatDate(comment.createdAt)}</span>
              </p>

              {comment.uid === currentUser?.uid && (
                <button
                  type="button"
                  onClick={() => removeComment(comment.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
            </div>

            <p className="mt-1.5 text-sm text-ink dark:text-dark-text whitespace-pre-wrap">{comment.text}</p>
          </div>
        ))}

        {loaded && hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded-md border border-parchment-200 dark:border-dark-border px-3 py-1.5 text-xs text-ink dark:text-dark-text"
          >
            {loadingMore ? 'Loading more...' : 'Load 20 more'}
          </button>
        )}
      </div>

      <div className="mt-3 rounded-md border border-parchment-200 dark:border-dark-border p-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={800}
          placeholder="Write a comment..."
          className="w-full rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-2.5 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage"
        />

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={submitComment}
            disabled={submitting || !text.trim() || !currentUser?.uid || effectiveCount >= 500}
            className="px-3 py-1.5 rounded-md bg-sage text-white text-sm hover:bg-sage-light disabled:opacity-60"
          >
            {effectiveCount >= 500 ? 'Comment limit reached' : submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </section>
  )
}
