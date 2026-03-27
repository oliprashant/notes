import { useEffect, useMemo, useState } from 'react'
import { Loader2, Reply, Trash2 } from 'lucide-react'
import { addComment, deleteComment, subscribeComments } from '../../firebase/socialService'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState([])
  const [replyingTo, setReplyingTo] = useState(null)
  const [text, setText] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeComments(
      note.id,
      (items) => {
        setComments(items)
        onCountChanged?.(items.length)
        setLoading(false)
      },
      () => setLoading(false)
    )

    return unsubscribe
  }, [note.id, onCountChanged])

  const commentsByParent = useMemo(() => {
    const grouped = new Map()
    comments.forEach((comment) => {
      const key = comment.parentId || '__root__'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(comment)
    })
    return grouped
  }, [comments])

  const rootComments = commentsByParent.get('__root__') || []

  const submitComment = async () => {
    if (!currentUser?.uid || !text.trim()) return
    setSubmitting(true)
    try {
      await addComment({
        noteId: note.id,
        currentUid: currentUser.uid,
        noteOwnerUid: note.uid,
        text,
        parentId: replyingTo,
        actor: {
          displayName: currentUser.displayName || '',
          username: currentUser.username || '',
          photoURL: currentUser.photoURL || '',
        },
      })
      setText('')
      setReplyingTo(null)
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
    } catch (error) {
      console.warn('Comment delete failed:', error)
    }
  }

  const renderComment = (comment, depth = 0) => {
    const replies = commentsByParent.get(comment.id) || []

    return (
      <div key={comment.id} className={`rounded-md border border-parchment-200 dark:border-dark-border p-2.5 ${depth > 0 ? 'ml-5 mt-2' : 'mb-2'}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink dark:text-dark-text">
            {comment.authorDisplayName || 'User'}
            <span className="ml-1 text-ink-muted dark:text-dark-muted">{formatDate(comment.createdAt)}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setReplyingTo(comment.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
            >
              <Reply size={12} />
              Reply
            </button>

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
        </div>

        <p className="mt-1.5 text-sm text-ink dark:text-dark-text whitespace-pre-wrap">{comment.text}</p>

        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section>
      <h4 className="text-sm font-semibold text-ink dark:text-dark-text">Comments</h4>

      <div className="mt-3 space-y-2">
        {loading && (
          <div className="inline-flex items-center gap-2 text-xs text-ink-muted dark:text-dark-muted">
            <Loader2 size={12} className="animate-spin" />
            Loading comments...
          </div>
        )}

        {!loading && rootComments.length === 0 && (
          <p className="text-xs text-ink-muted dark:text-dark-muted">No comments yet.</p>
        )}

        {rootComments.map((comment) => renderComment(comment))}
      </div>

      <div className="mt-3 rounded-md border border-parchment-200 dark:border-dark-border p-2">
        {replyingTo && (
          <p className="mb-2 text-xs text-sage">
            Replying to comment.{' '}
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="underline"
            >
              Cancel
            </button>
          </p>
        )}

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
            disabled={submitting || !text.trim() || !currentUser?.uid}
            className="px-3 py-1.5 rounded-md bg-sage text-white text-sm hover:bg-sage-light disabled:opacity-60"
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </section>
  )
}
