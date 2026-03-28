import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Clock3, Heart, MessageCircle, Send, UserCircle2 } from 'lucide-react'
import CommentSection from './CommentSection'
import ShareModal from './ShareModal'
import Modal from '../UI/Modal'
import { toggleLike } from '../../firebase/socialService'

const BOOKMARK_KEY = 'noteflow_post_bookmarks_v1'

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
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

function getLikeStorageKey(uid, noteId) {
  return `noteflow_post_like_${uid}_${noteId}`
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    const parsed = JSON.parse(raw || '[]')
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveBookmarks(setValue) {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...setValue]))
}

export default function PostCard({ note, currentUser }) {
  const content = useMemo(() => stripHtml(note.content || ''), [note.content])
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [visibleImages, setVisibleImages] = useState(false)
  const [likeCount, setLikeCount] = useState(Number(note.likeCount || 0))
  const [commentCount, setCommentCount] = useState(Number(note.commentCount || 0))
  const [liked, setLiked] = useState(false)
  const [syncingLike, setSyncingLike] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  const likeTimerRef = useRef(null)
  const lastSyncedLikeRef = useRef(false)
  const imageBlockRef = useRef(null)

  const previewText = content.length > 200 && !expanded ? `${content.slice(0, 200)}...` : content
  const readMinutes = Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))

  useEffect(() => {
    if (!currentUser?.uid) return

    const likeState = localStorage.getItem(getLikeStorageKey(currentUser.uid, note.id)) === '1'
    setLiked(likeState)
    lastSyncedLikeRef.current = likeState

    const bookmarks = loadBookmarks()
    setBookmarked(bookmarks.has(note.id))
  }, [currentUser?.uid, note.id])

  useEffect(() => {
    if (!imageBlockRef.current || !Array.isArray(note.images) || note.images.length === 0) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleImages(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(imageBlockRef.current)
    return () => observer.disconnect()
  }, [note.images])

  useEffect(() => {
    return () => {
      if (likeTimerRef.current) clearTimeout(likeTimerRef.current)
    }
  }, [])

  const syncLike = async (nextLiked) => {
    if (!currentUser?.uid || syncingLike) return
    if (nextLiked === lastSyncedLikeRef.current) return

    setSyncingLike(true)
    try {
      const serverLiked = await toggleLike({
        noteId: note.id,
        currentUid: currentUser.uid,
        noteOwnerUid: note.uid,
        actor: {
          displayName: currentUser.displayName || '',
          username: currentUser.username || '',
          photoURL: currentUser.photoURL || '',
        },
      })
      setLiked(serverLiked)
      lastSyncedLikeRef.current = serverLiked
      localStorage.setItem(getLikeStorageKey(currentUser.uid, note.id), serverLiked ? '1' : '0')
    } catch {
      setLiked(lastSyncedLikeRef.current)
      setLikeCount((prev) => Math.max(0, prev + (lastSyncedLikeRef.current ? 1 : -1)))
    } finally {
      setSyncingLike(false)
    }
  }

  const handleLike = () => {
    if (!currentUser?.uid) return

    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)))

    if (likeTimerRef.current) clearTimeout(likeTimerRef.current)
    likeTimerRef.current = setTimeout(() => {
      syncLike(nextLiked)
    }, 360)
  }

  const handleBookmark = () => {
    const current = loadBookmarks()
    if (current.has(note.id)) {
      current.delete(note.id)
      setBookmarked(false)
    } else {
      current.add(note.id)
      setBookmarked(true)
    }
    saveBookmarks(current)
  }

  return (
    <article className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 shadow-note">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted dark:text-dark-muted">{formatTime(note.createdAt)}</p>
          <h3 className="mt-0.5 text-base font-semibold text-ink dark:text-dark-text truncate">{note.title || 'Untitled'}</h3>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted dark:text-dark-muted">
            <UserCircle2 size={12} />
            @{note.ownerUsername || 'user'}
            <span className="mx-1">.</span>
            <Clock3 size={12} />
            {readMinutes} min read
          </div>
        </div>

        <button
          type="button"
          onClick={handleBookmark}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted"
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
        >
          <Bookmark size={14} className={bookmarked ? 'fill-current text-sage' : ''} />
        </button>
      </header>

      <p className="mt-3 text-sm text-ink dark:text-dark-text whitespace-pre-wrap">{previewText || 'No content yet.'}</p>
      {content.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs text-sage hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div ref={imageBlockRef} className="mt-3 grid gap-2 sm:grid-cols-2">
        {Array.isArray(note.images) && note.images.length > 0 && !visibleImages && (
          <div className="h-24 rounded-md bg-parchment-100 dark:bg-dark-hover animate-pulse sm:col-span-2" />
        )}
        {visibleImages && Array.isArray(note.images) && note.images.slice(0, 4).map((image, index) => (
          <img
            key={`${note.id}_img_${index}`}
            src={image.url}
            alt="Post media"
            loading="lazy"
            className="h-40 w-full rounded-md object-cover"
          />
        ))}
      </div>

      <footer className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={!currentUser?.uid}
          className="inline-flex items-center gap-1.5 rounded-md border border-parchment-200 dark:border-dark-border px-2.5 py-1.5 text-sm text-ink dark:text-dark-text disabled:opacity-60"
        >
          <Heart size={14} className={liked ? 'fill-current text-red-500' : ''} />
          {likeCount}
        </button>

        <button
          type="button"
          onClick={() => setShowComments(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-parchment-200 dark:border-dark-border px-2.5 py-1.5 text-sm text-ink dark:text-dark-text"
        >
          <MessageCircle size={14} />
          {commentCount}
        </button>

        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-parchment-200 dark:border-dark-border px-2.5 py-1.5 text-sm text-ink dark:text-dark-text"
        >
          <Send size={14} />
          Share
        </button>
      </footer>

      <Modal isOpen={showComments} onClose={() => setShowComments(false)} title="Comments" size="lg">
        <CommentSection
          note={note}
          currentUser={currentUser}
          onCountChanged={(count) => setCommentCount(count)}
        />
      </Modal>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        post={note}
        currentUser={currentUser}
      />
    </article>
  )
}
