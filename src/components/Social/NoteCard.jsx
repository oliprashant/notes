import { useMemo, useState } from 'react'
import { Bookmark, Heart, MessageCircle, Send, UserCircle2 } from 'lucide-react'
import CommentSection from './CommentSection'
import { toggleLike, toggleBookmark } from '../../firebase/socialService'

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getPreview(content = '', maxLength = 220) {
  const plain = stripHtml(content)
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain
}

function formatTime(date) {
  if (!date) return 'Just now'
  const now = Date.now()
  const ts = new Date(date).getTime()
  const mins = Math.floor((now - ts) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NoteCard({
  note,
  currentUser,
  isBookmarked = false,
  onBookmarkChanged,
}) {
  const [expandedComments, setExpandedComments] = useState(false)
  const [liking, setLiking] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(Number(note.likeCount || 0))
  const [commentCount, setCommentCount] = useState(Number(note.commentCount || 0))

  const preview = useMemo(() => getPreview(note.content || ''), [note.content])

  const onToggleLike = async () => {
    if (!currentUser?.uid || liking) return
    setLiking(true)

    try {
      const nextLiked = await toggleLike({
        noteId: note.id,
        currentUid: currentUser.uid,
        noteOwnerUid: note.uid,
        actor: {
          displayName: currentUser.displayName || '',
          username: currentUser.username || '',
          photoURL: currentUser.photoURL || '',
        },
      })

      setLiked(nextLiked)
      setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)))
    } catch (error) {
      console.warn('Like toggle failed:', error)
    } finally {
      setLiking(false)
    }
  }

  const onToggleBookmark = async () => {
    if (!currentUser?.uid || bookmarking) return
    setBookmarking(true)
    try {
      const bookmarked = await toggleBookmark({ userId: currentUser.uid, note })
      onBookmarkChanged?.(note.id, bookmarked)
    } catch (error) {
      console.warn('Bookmark toggle failed:', error)
    } finally {
      setBookmarking(false)
    }
  }

  return (
    <article className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 shadow-note">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink dark:text-dark-text truncate">{note.title || 'Untitled'}</h3>
          <p className="mt-1 text-xs text-ink-muted dark:text-dark-muted">{formatTime(note.createdAt)}</p>
        </div>

        <button
          type="button"
          onClick={onToggleBookmark}
          disabled={bookmarking || !currentUser?.uid}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark size={14} className={isBookmarked ? 'fill-current text-sage' : ''} />
        </button>
      </header>

      <p className="mt-3 text-sm text-ink dark:text-dark-text whitespace-pre-wrap">{preview || 'No content yet.'}</p>

      <footer className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLike}
          disabled={liking || !currentUser?.uid}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-parchment-200 dark:border-dark-border text-sm text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
        >
          <Heart size={14} className={liked ? 'text-red-500 fill-current' : ''} />
          {likeCount}
        </button>

        <button
          type="button"
          onClick={() => setExpandedComments((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-parchment-200 dark:border-dark-border text-sm text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover"
        >
          <MessageCircle size={14} />
          {commentCount}
        </button>

        <a
          href={`/shared/${note.id}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-parchment-200 dark:border-dark-border text-sm text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover ml-auto"
        >
          <Send size={14} />
          Share
        </a>
      </footer>

      {expandedComments && (
        <div className="mt-4 border-t border-parchment-200 dark:border-dark-border pt-3">
          <CommentSection
            note={note}
            currentUser={currentUser}
            onCountChanged={(count) => setCommentCount(count)}
          />
        </div>
      )}

      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted dark:text-dark-muted">
        <UserCircle2 size={12} />
        @{note.ownerUsername || 'user'}
      </div>
    </article>
  )
}
