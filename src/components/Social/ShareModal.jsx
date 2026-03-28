import { useEffect, useMemo, useState } from 'react'
import { Loader2, Send, Share2 } from 'lucide-react'
import Modal from '../UI/Modal'
import { searchUsersByPrefix, sharePostToUser } from '../../firebase/socialService'

function getShareUrl(postId) {
  return `${window.location.origin}/shared/${postId}`
}

function upsertMeta(property, content) {
  if (!property || !content) return () => {}

  const selector = `meta[property="${property}"]`
  const existing = document.head.querySelector(selector)
  const previous = existing?.getAttribute('content') ?? null
  const element = existing || document.createElement('meta')

  element.setAttribute('property', property)
  element.setAttribute('content', content)

  if (!existing) {
    document.head.appendChild(element)
  }

  return () => {
    if (previous == null) {
      element.remove()
      return
    }
    element.setAttribute('content', previous)
  }
}

export default function ShareModal({ isOpen, onClose, post, currentUser }) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')

  const shareUrl = useMemo(() => getShareUrl(post?.id), [post?.id])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setMatches([])
      setError('')
      setCopied(false)
      return
    }

    if (query.trim().length < 3) {
      setMatches([])
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const users = await searchUsersByPrefix(query.trim().toLowerCase(), 5)
        if (active) setMatches(users)
      } catch {
        if (active) setMatches([])
      } finally {
        if (active) setSearching(false)
      }
    }, 350)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [isOpen, query])

  useEffect(() => {
    if (!isOpen || !post?.id) return undefined

    const cleanupTitle = upsertMeta('og:title', 'Noteflow post')
    const cleanupDescription = upsertMeta('og:description', String(post.content || '').slice(0, 160) || 'A shared note from Noteflow')
    const cleanupUrl = upsertMeta('og:url', shareUrl)

    return () => {
      cleanupTitle()
      cleanupDescription()
      cleanupUrl()
    }
  }, [isOpen, post?.content, post?.id, shareUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy link to clipboard.')
    }
  }

  const shareWithNative = async () => {
    if (!navigator.share) return

    try {
      await navigator.share({
        title: 'Noteflow post',
        text: 'Check out this post on Noteflow',
        url: shareUrl,
      })
    } catch {
      // Ignore user-cancelled share events.
    }
  }

  const shareToUser = async (targetUid) => {
    if (!currentUser?.uid || !post?.id || sharing) return

    setSharing(true)
    setError('')
    try {
      await sharePostToUser({
        fromUid: currentUser.uid,
        targetUid,
        postId: post.id,
        actorName: currentUser.displayName || currentUser.username || 'Someone',
      })
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to share post with this user.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share post" size="md">
      <div className="space-y-4">
        <div className="rounded-md border border-parchment-200 dark:border-dark-border p-3">
          <p className="text-xs text-ink-muted dark:text-dark-muted">Public link</p>
          <p className="mt-1 truncate text-sm text-ink dark:text-dark-text">{shareUrl}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-light"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={shareWithNative}
                className="inline-flex items-center gap-1 rounded-md border border-parchment-200 dark:border-dark-border px-3 py-1.5 text-xs text-ink dark:text-dark-text"
              >
                <Share2 size={12} />
                Share
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted dark:text-dark-muted">Share to user</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a username (3+ chars)"
            className="mt-1 w-full rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text"
          />

          {query.trim().length > 0 && query.trim().length < 3 && (
            <p className="mt-2 text-xs text-ink-muted dark:text-dark-muted">Type at least 3 characters to search.</p>
          )}

          {searching && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted dark:text-dark-muted">
              <Loader2 size={12} className="animate-spin" />
              Searching users...
            </p>
          )}

          {!searching && matches.length > 0 && (
            <div className="mt-2 space-y-1">
              {matches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => shareToUser(item.id)}
                  className="flex w-full items-center justify-between rounded-md border border-parchment-200 dark:border-dark-border px-2.5 py-2 text-left hover:bg-parchment-50 dark:hover:bg-dark-hover"
                  disabled={sharing}
                >
                  <span className="text-sm text-ink dark:text-dark-text">@{item.username}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-sage">
                    <Send size={12} />
                    Send
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
