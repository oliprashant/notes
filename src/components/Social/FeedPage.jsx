import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Compass, Flame, Loader2, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePosts } from '../../hooks/usePosts'
import {
  getForYouFeedPage,
  getFollowingFeedPage,
  getFollowingUserIds,
  getLatestPublicNotesPage,
  getTrendingPublicNotes,
} from '../../firebase/socialService'
import CreatePost from './CreatePost'
import PostCard from './PostCard'
import UsageMonitorPanel from './UsageMonitorPanel'

const TAB_FOR_YOU = 'forYou'
const TAB_FOLLOWING = 'following'
const TAB_TRENDING = 'trending'
const TAB_LATEST = 'latest'

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 animate-pulse">
          <div className="h-4 w-1/3 bg-parchment-200 dark:bg-dark-hover rounded" />
          <div className="mt-3 h-3 w-full bg-parchment-200 dark:bg-dark-hover rounded" />
          <div className="mt-2 h-3 w-5/6 bg-parchment-200 dark:bg-dark-hover rounded" />
          <div className="mt-4 h-8 w-full bg-parchment-200 dark:bg-dark-hover rounded" />
        </div>
      ))}
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const {
    createPost,
    queueSize,
    usageWarning,
    storageWarning,
    flushQueue,
  } = usePosts({ currentUser: user, autoLoad: false })
  const [activeTab, setActiveTab] = useState(TAB_FOR_YOU)
  const [pullDistance, setPullDistance] = useState(0)

  const [forYouNotes, setForYouNotes] = useState([])
  const [forYouCursor, setForYouCursor] = useState(null)
  const [forYouHasMore, setForYouHasMore] = useState(true)

  const [latestNotes, setLatestNotes] = useState([])
  const [latestCursor, setLatestCursor] = useState(null)
  const [latestHasMore, setLatestHasMore] = useState(true)

  const [followingNotes, setFollowingNotes] = useState([])
  const [followingIds, setFollowingIds] = useState([])
  const [followingCursors, setFollowingCursors] = useState({})
  const [followingHasMore, setFollowingHasMore] = useState(true)

  const [trendingNotes, setTrendingNotes] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const loadMoreRef = useRef(null)
  const pullStartYRef = useRef(null)

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let ids = []
      if (user?.uid) {
        ids = await getFollowingUserIds(user.uid, 30)
        setFollowingIds(ids)
      } else {
        setFollowingIds([])
      }

      const [forYouPage, latestPage, trendingPage] = await Promise.all([
        getForYouFeedPage({ userId: user?.uid, followingIds: ids, pageSize: 14 }),
        getLatestPublicNotesPage({ pageSize: 14 }),
        getTrendingPublicNotes(24, 40),
      ])

      setForYouNotes(forYouPage.items)
      setForYouCursor(forYouPage.nextCursor)
      setForYouHasMore(forYouPage.hasMore)

      setLatestNotes(latestPage.items)
      setLatestCursor(latestPage.nextCursor)
      setLatestHasMore(latestPage.hasMore)

      setTrendingNotes(trendingPage)

      if (ids.length) {
        const followingPage = await getFollowingFeedPage({ followedIds: ids, pageSize: 14, cursors: {} })
        setFollowingNotes(followingPage.items)
        setFollowingCursors(followingPage.nextCursors)
        setFollowingHasMore(followingPage.hasMore)
      } else {
        setFollowingNotes([])
        setFollowingHasMore(false)
      }
    } catch (err) {
      setError(err?.message || 'Failed to load feed.')
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const loadMore = useCallback(async () => {
    if (loadingMore) return

    try {
      setLoadingMore(true)

      if (activeTab === TAB_FOR_YOU && forYouHasMore) {
        const page = await getForYouFeedPage({
          userId: user?.uid,
          followingIds,
          pageSize: 14,
          cursor: forYouCursor,
        })

        setForYouNotes((prev) => {
          const map = new Map(prev.map((item) => [item.id, item]))
          page.items.forEach((item) => map.set(item.id, item))
          return [...map.values()]
        })
        setForYouCursor(page.nextCursor)
        setForYouHasMore(page.hasMore)
      }

      if (activeTab === TAB_LATEST && latestHasMore) {
        const page = await getLatestPublicNotesPage({ pageSize: 14, cursor: latestCursor })
        setLatestNotes((prev) => {
          const map = new Map(prev.map((item) => [item.id, item]))
          page.items.forEach((item) => map.set(item.id, item))
          return [...map.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        })
        setLatestCursor(page.nextCursor)
        setLatestHasMore(page.hasMore)
      }

      if (activeTab === TAB_FOLLOWING && followingHasMore) {
        const page = await getFollowingFeedPage({
          followedIds: followingIds,
          pageSize: 14,
          cursors: followingCursors,
        })
        setFollowingNotes((prev) => {
          const map = new Map(prev.map((item) => [item.id, item]))
          page.items.forEach((item) => map.set(item.id, item))
          return [...map.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        })
        setFollowingCursors(page.nextCursors)
        setFollowingHasMore(page.hasMore)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [
    activeTab,
    forYouCursor,
    forYouHasMore,
    followingCursors,
    followingHasMore,
    followingIds,
    latestCursor,
    latestHasMore,
    loadingMore,
    user?.uid,
  ])

  useEffect(() => {
    if (!loadMoreRef.current) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    const onTouchStart = (event) => {
      if (window.scrollY > 0) return
      pullStartYRef.current = event.touches[0]?.clientY ?? null
    }

    const onTouchMove = (event) => {
      if (pullStartYRef.current == null) return
      const delta = (event.touches[0]?.clientY ?? 0) - pullStartYRef.current
      if (delta > 0) {
        setPullDistance(Math.min(delta, 90))
      }
    }

    const onTouchEnd = async () => {
      if (pullDistance > 70) {
        await bootstrap()
      }
      setPullDistance(0)
      pullStartYRef.current = null
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [bootstrap, pullDistance])

  const activeNotes = useMemo(() => {
    if (activeTab === TAB_FOR_YOU) return forYouNotes
    if (activeTab === TAB_FOLLOWING) return followingNotes
    if (activeTab === TAB_LATEST) return latestNotes
    return trendingNotes
  }, [activeTab, forYouNotes, followingNotes, latestNotes, trendingNotes])

  const hasMore =
    activeTab === TAB_FOR_YOU
      ? forYouHasMore
      : activeTab === TAB_FOLLOWING
        ? followingHasMore
        : activeTab === TAB_LATEST
          ? latestHasMore
          : false

  const onCreatePost = async (payload) => {
    if (!user?.uid) throw new Error('Sign in to post.')

    const result = await createPost(payload)
    if (result.queued) {
      setError('You are offline. Your post is queued and will retry automatically.')
      return
    }

    const created = result.post
    if (!created || created.visibility !== 'public') return

    setForYouNotes((prev) => [created, ...prev])
    setLatestNotes((prev) => [created, ...prev])

    if (followingIds.includes(user.uid)) {
      setFollowingNotes((prev) => [created, ...prev])
    }

    setTrendingNotes((prev) => [created, ...prev].slice(0, 24))
  }

  return (
    <div className="h-full overflow-y-auto bg-parchment-50 dark:bg-dark-bg p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="text-center text-xs text-ink-muted dark:text-dark-muted" style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}>
          {pullDistance > 70 ? 'Release to refresh' : pullDistance > 0 ? 'Pull to refresh' : ''}
        </div>

        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink dark:text-dark-text">Feed</h1>
            <p className="text-sm text-ink-muted dark:text-dark-muted">Algorithmic discovery tuned for engagement and freshness.</p>
          </div>

          <div className="inline-flex rounded-lg border border-parchment-200 dark:border-dark-border p-1 bg-white dark:bg-dark-surface flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab(TAB_FOR_YOU)}
              className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 ${activeTab === TAB_FOR_YOU ? 'bg-sage text-white' : 'text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover'}`}
            >
              <Sparkles size={14} />
              For You
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB_FOLLOWING)}
              className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 ${activeTab === TAB_FOLLOWING ? 'bg-sage text-white' : 'text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover'}`}
            >
              <Users size={14} />
              Following
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB_TRENDING)}
              className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 ${activeTab === TAB_TRENDING ? 'bg-sage text-white' : 'text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover'}`}
            >
              <Flame size={14} />
              Trending
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB_LATEST)}
              className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 ${activeTab === TAB_LATEST ? 'bg-sage text-white' : 'text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover'}`}
            >
              <Compass size={14} />
              Latest
            </button>
          </div>
        </header>

        <CreatePost onCreate={onCreatePost} disabled={!user?.uid} />

        {import.meta.env.DEV && (
          <UsageMonitorPanel
            usageWarning={usageWarning}
            storageWarning={storageWarning}
            queueSize={queueSize}
          />
        )}

        {queueSize > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {queueSize} queued post(s) waiting for upload.
            <button
              type="button"
              onClick={() => flushQueue(20)}
              className="ml-2 underline"
            >
              Retry now
            </button>
          </div>
        )}

        {usageWarning?.nearLimit && (
          <p className="text-xs text-amber-700">{usageWarning.warnings.join(' | ')}</p>
        )}

        {storageWarning?.nearLimit && (
          <p className="text-xs text-amber-700">{storageWarning.message}</p>
        )}

        <button
          type="button"
          onClick={bootstrap}
          className="px-3 py-1.5 rounded-md text-xs border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
        >
          Refresh feed
        </button>

        {loading && <FeedSkeleton />}

        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && activeNotes.length === 0 && (
          <div className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-5 text-sm text-ink-muted dark:text-dark-muted">
            {activeTab === TAB_FOLLOWING ? 'Follow users to build your personalized feed.' : 'No notes found for this tab yet.'}
          </div>
        )}

        {!loading && activeNotes.map((note) => (
          <PostCard
            key={note.id}
            note={note}
            currentUser={user}
          />
        ))}

        <div ref={loadMoreRef} className="h-8" />

        {loadingMore && (
          <div className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-dark-muted">
            <Loader2 size={14} className="animate-spin" />
            Loading more...
          </div>
        )}

        {!loadingMore && !hasMore && activeNotes.length > 0 && activeTab !== TAB_TRENDING && (
          <p className="text-xs text-ink-muted dark:text-dark-muted">You reached the end.</p>
        )}
      </div>
    </div>
  )
}
