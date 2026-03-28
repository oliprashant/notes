import { useCallback, useEffect, useState } from 'react'
import { get, set } from 'idb-keyval'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/config'
import { createSocialPost, getPublicFeedPage } from '../firebase/socialService'
import { estimatePostCost, trackDailyReads, trackDailyWrites, warnWhenCloseToLimit } from '../utils/firestoreMonitor'
import { showUsageWarning, trackStorageUsage } from '../utils/storageMonitor'

const POSTS_CACHE_KEY = 'noteflow_posts_cache_v1'
const POSTS_QUEUE_KEY = 'noteflow_posts_queue_v1'
const CACHE_TTL_MS = 30 * 60 * 1000

async function loadCache() {
  const cached = await get(POSTS_CACHE_KEY)
  if (!cached) return null
  if (Date.now() - Number(cached.at || 0) > CACHE_TTL_MS) return null
  return Array.isArray(cached.items) ? cached.items : null
}

async function saveCache(items) {
  await set(POSTS_CACHE_KEY, { at: Date.now(), items })
}

async function loadQueue() {
  const queue = await get(POSTS_QUEUE_KEY)
  return Array.isArray(queue) ? queue : []
}

async function saveQueue(queue) {
  await set(POSTS_QUEUE_KEY, queue)
}

async function uploadImages(uid, imageFiles = []) {
  const limited = imageFiles.slice(0, 4)
  const uploaded = []

  for (let i = 0; i < limited.length; i += 1) {
    const file = limited[i]
    const safeName = String(file.name || `image_${i}`).replace(/[^a-zA-Z0-9_.-]/g, '_')
    const path = `post-images/${uid}/${Date.now()}_${i}_${safeName}`
    const uploadRef = ref(storage, path)
    await uploadBytes(uploadRef, file)
    const url = await getDownloadURL(uploadRef)
    uploaded.push({
      url,
      path,
      size: Number(file.size || 0),
      width: 0,
      height: 0,
    })
    trackStorageUsage(file.size)
  }

  return uploaded
}

export function usePosts({ currentUser, autoLoad = true } = {}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [queueSize, setQueueSize] = useState(0)
  const [usageWarning, setUsageWarning] = useState(null)
  const [storageWarning, setStorageWarning] = useState(null)

  const refreshWarnings = useCallback(async () => {
    setUsageWarning(warnWhenCloseToLimit())
    setStorageWarning(await showUsageWarning())
  }, [])

  const loadPosts = useCallback(async ({ forceRefresh = false } = {}) => {
    setLoading(true)
    setError('')

    try {
      if (!forceRefresh) {
        const cached = await loadCache()
        if (cached) {
          setPosts(cached)
          setLoading(false)
          return
        }
      }

      const page = await getPublicFeedPage({ pageSize: 12 })
      setPosts(page.items)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
      await saveCache(page.items)
      trackDailyReads(page.items.length)
      await refreshWarnings()
    } catch (err) {
      setError(err?.message || 'Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }, [refreshWarnings])

  const loadMorePosts = useCallback(async () => {
    if (!cursor || !hasMore || loading) return

    setLoading(true)
    try {
      const page = await getPublicFeedPage({ pageSize: 12, cursor })
      setPosts((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]))
        page.items.forEach((item) => map.set(item.id, item))
        const merged = [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        saveCache(merged)
        return merged
      })
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
      trackDailyReads(page.items.length)
      await refreshWarnings()
    } catch (err) {
      setError(err?.message || 'Failed to load more posts.')
    } finally {
      setLoading(false)
    }
  }, [cursor, hasMore, loading, refreshWarnings])

  const submitPost = useCallback(async (payload) => {
    if (!currentUser?.uid) throw new Error('You must be signed in to post.')

    const images = await uploadImages(currentUser.uid, payload.imageFiles || [])
    const id = await createSocialPost({
      uid: currentUser.uid,
      content: payload.content,
      visibility: payload.visibility || 'public',
      tags: payload.tags || [],
      images,
      ownerUsername: currentUser.username || '',
      ownerDisplayName: currentUser.displayName || '',
    })

    trackDailyWrites(2 + images.length)
    await refreshWarnings()

    return {
      id,
      content: payload.content,
      visibility: payload.visibility || 'public',
      tags: payload.tags || [],
      images,
      uid: currentUser.uid,
      ownerUsername: currentUser.username || '',
      ownerDisplayName: currentUser.displayName || '',
      createdAt: new Date(),
      likeCount: 0,
      commentCount: 0,
    }
  }, [currentUser?.displayName, currentUser?.uid, currentUser?.username, refreshWarnings])

  const createPost = useCallback(async (payload) => {
    const estimate = estimatePostCost({
      imageCount: (payload.imageFiles || []).length,
      tagCount: (payload.tags || []).length,
      withMentions: /@[a-z0-9_]{3,20}/i.test(payload.content || ''),
    })

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queue = await loadQueue()
      const queued = [
        ...queue,
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          payload,
          retries: 0,
          createdAt: Date.now(),
          estimate,
        },
      ]
      await saveQueue(queued)
      setQueueSize(queued.length)
      return { queued: true, estimate }
    }

    const created = await submitPost(payload)
    setPosts((prev) => [created, ...prev])
    return { queued: false, estimate, post: created }
  }, [submitPost])

  const flushQueue = useCallback(async (batchSize = 20) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { processed: 0, failed: 0 }

    const queue = await loadQueue()
    if (!queue.length) {
      setQueueSize(0)
      return { processed: 0, failed: 0 }
    }

    const maxBatch = Math.max(1, Math.min(20, Number(batchSize || 20)))
    const chunk = queue.slice(0, maxBatch)
    const remaining = queue.slice(maxBatch)

    let processed = 0
    let failed = 0
    const retries = []

    for (const item of chunk) {
      try {
        const created = await submitPost(item.payload)
        setPosts((prev) => [created, ...prev])
        processed += 1
      } catch {
        failed += 1
        retries.push({
          ...item,
          retries: Number(item.retries || 0) + 1,
        })
      }
    }

    const nextQueue = [...retries.filter((item) => item.retries < 4), ...remaining]
    await saveQueue(nextQueue)
    setQueueSize(nextQueue.length)

    return { processed, failed }
  }, [submitPost])

  const retryFailedPosts = useCallback(async () => {
    return flushQueue(20)
  }, [flushQueue])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const queue = await loadQueue()
      if (mounted) setQueueSize(queue.length)
      await refreshWarnings()
      if (autoLoad) {
        await loadPosts()
      }
    }

    init()

    const onOnline = () => {
      flushQueue(20)
    }

    window.addEventListener('online', onOnline)
    return () => {
      mounted = false
      window.removeEventListener('online', onOnline)
    }
  }, [autoLoad, flushQueue, loadPosts, refreshWarnings])

  return {
    posts,
    loading,
    error,
    hasMore,
    queueSize,
    usageWarning,
    storageWarning,
    loadPosts,
    loadMorePosts,
    createPost,
    flushQueue,
    retryFailedPosts,
  }
}

export default usePosts
