import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  documentId,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import { calculateTrendingNotes } from '../utils/socialHelpers'
import { diversifyFeed, scoreFeedNote } from '../utils/engagementHelpers'

const NOTES_COLLECTION = 'notes'
const USERS_COLLECTION = 'users'
const USERNAMES_COLLECTION = 'usernames'
const FOLLOWING_COLLECTION = 'following'
const ACTIVITIES_COLLECTION = 'activities'
const NOTIFICATIONS_COLLECTION = 'notifications'
const MAX_BATCH_WRITES = 400

const cache = {
  latestNotes: { at: 0, items: [] },
  userInterests: new Map(),
}

const CACHE_TTL_MS = 30 * 1000

const MENTION_REGEX = /@([a-z0-9_]{3,20})/gi

function normalizeDate(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function mapNote(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    createdAt: normalizeDate(data.createdAt) || new Date(),
    updatedAt: normalizeDate(data.updatedAt) || new Date(),
  }
}

function toText(value) {
  return String(value || '').toLowerCase()
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ')
}

function matchesDateRange(note, dateRange) {
  if (!dateRange?.from && !dateRange?.to) return true
  const createdAt = normalizeDate(note.createdAt)
  if (!createdAt) return false

  if (dateRange.from) {
    const from = new Date(dateRange.from)
    if (createdAt < from) return false
  }
  if (dateRange.to) {
    const to = new Date(dateRange.to)
    if (createdAt > to) return false
  }
  return true
}

function scoreSearchResult(note, queryText) {
  const q = toText(queryText)
  if (!q) return 0

  const title = toText(note.title)
  const content = toText(stripHtml(note.content))
  const tags = Array.isArray(note.tags) ? note.tags.map(toText) : []
  const username = toText(note.ownerUsername)

  let score = 0
  if (title.includes(q)) score += 6
  if (username.includes(q)) score += 5
  if (tags.some((tag) => tag.includes(q))) score += 4
  if (content.includes(q)) score += 2

  score += Number(note.likeCount || 0) * 0.05
  score += Number(note.commentCount || 0) * 0.08

  return Number(score.toFixed(4))
}

export function extractMentions(text = '') {
  const found = new Set()
  let match = MENTION_REGEX.exec(text)
  while (match) {
    found.add((match[1] || '').toLowerCase())
    match = MENTION_REGEX.exec(text)
  }
  MENTION_REGEX.lastIndex = 0
  return [...found]
}

export async function resolveMentionUserIds(mentions = []) {
  const resolved = []
  for (const username of mentions.slice(0, 20)) {
    const snap = await getDoc(doc(db, USERNAMES_COLLECTION, username))
    if (snap.exists()) {
      const uid = snap.data()?.uid
      if (uid) resolved.push(uid)
    }
  }
  return [...new Set(resolved)]
}

export async function getPublicFeedPage({ pageSize = 12, cursor = null } = {}) {
  let feedQuery = query(
    collection(db, NOTES_COLLECTION),
    where('visibility', '==', 'public'),
    where('deleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )

  if (cursor) {
    feedQuery = query(
      collection(db, NOTES_COLLECTION),
      where('visibility', '==', 'public'),
      where('deleted', '==', false),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(pageSize)
    )
  }

  const snap = await getDocs(feedQuery)
  const docs = snap.docs
  return {
    items: docs.map(mapNote),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: docs.length === pageSize,
  }
}

export async function getLatestPublicNotesPage({ pageSize = 24, cursor = null } = {}) {
  return getPublicFeedPage({ pageSize, cursor })
}

export async function getUserInterestTags(userId, maxSignals = 40) {
  if (!userId) return new Set()
  const cached = cache.userInterests.get(userId)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.tags
  }

  const userNotesQuery = query(
    collection(db, NOTES_COLLECTION),
    where('uid', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(maxSignals)
  )

  const snapshot = await getDocs(userNotesQuery)
  const tags = new Set()
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag) => tags.add(toText(tag)))
    }
  })

  cache.userInterests.set(userId, { at: Date.now(), tags })
  return tags
}

export async function getForYouFeedPage({
  userId,
  followingIds = [],
  cursor = null,
  pageSize = 16,
} = {}) {
  const candidateSize = Math.min(50, Math.max(pageSize * 3, 24))
  const page = await getPublicFeedPage({ pageSize: candidateSize, cursor })
  const interestTags = await getUserInterestTags(userId)
  const following = new Set(followingIds)

  const scored = page.items
    .map((note) => {
      const relationshipScore = following.has(note.uid) ? 1 : 0
      const score = scoreFeedNote(note, {
        followingIds: following,
        interestTags,
      })

      return {
        ...note,
        feedScore: score,
        relationshipScore,
      }
    })
    .sort((a, b) => b.feedScore - a.feedScore)

  const diversified = diversifyFeed(scored).slice(0, pageSize)
  return {
    items: diversified,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  }
}

export async function getFollowingUserIds(currentUid, maxFollowing = 30) {
  const followingQuery = query(
    collection(db, FOLLOWING_COLLECTION, currentUid, 'userFollowing'),
    orderBy('createdAt', 'desc'),
    limit(maxFollowing)
  )

  const snap = await getDocs(followingQuery)
  return snap.docs.map((d) => d.id)
}

export async function getFollowingFeedPage({ followedIds = [], pageSize = 12, cursors = {} } = {}) {
  if (!followedIds.length) {
    return { items: [], nextCursors: {}, hasMore: false }
  }

  const chunks = []
  for (let i = 0; i < followedIds.length; i += 10) {
    chunks.push(followedIds.slice(i, i + 10))
  }

  const chunkResults = await Promise.all(
    chunks.map(async (chunk, index) => {
      const cursor = cursors[index] || null
      let qRef = query(
        collection(db, NOTES_COLLECTION),
        where('uid', 'in', chunk),
        where('visibility', '==', 'public'),
        where('deleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      )

      if (cursor) {
        qRef = query(
          collection(db, NOTES_COLLECTION),
          where('uid', 'in', chunk),
          where('visibility', '==', 'public'),
          where('deleted', '==', false),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(pageSize)
        )
      }

      const snap = await getDocs(qRef)
      return {
        index,
        docs: snap.docs,
        hasMore: snap.docs.length === pageSize,
      }
    })
  )

  const mergedMap = new Map()
  const nextCursors = { ...cursors }
  let hasMore = false

  chunkResults.forEach((chunk) => {
    if (chunk.docs.length) {
      nextCursors[chunk.index] = chunk.docs[chunk.docs.length - 1]
      chunk.docs.forEach((d) => {
        if (!mergedMap.has(d.id)) mergedMap.set(d.id, mapNote(d))
      })
    }
    if (chunk.hasMore) hasMore = true
  })

  const sorted = [...mergedMap.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return {
    items: sorted.slice(0, pageSize),
    nextCursors,
    hasMore,
  }
}

export async function getBookmarkedNoteIds(userId) {
  const snap = await getDocs(collection(db, USERS_COLLECTION, userId, 'bookmarks'))
  return new Set(snap.docs.map((d) => d.id))
}

export async function toggleBookmark({ userId, note }) {
  const bookmarkRef = doc(db, USERS_COLLECTION, userId, 'bookmarks', note.id)
  const noteRef = doc(db, NOTES_COLLECTION, note.id)
  let bookmarked = false

  await runTransaction(db, async (tx) => {
    const bookmarkSnap = await tx.get(bookmarkRef)
    if (bookmarkSnap.exists()) {
      tx.delete(bookmarkRef)
      tx.update(noteRef, {
        bookmarkCount: increment(-1),
        lastInteractionAt: Timestamp.now(),
      })
      bookmarked = false
      return
    }

    tx.set(bookmarkRef, {
      noteId: note.id,
      ownerUid: note.uid,
      title: note.title || 'Untitled',
      createdAt: serverTimestamp(),
    })
    tx.update(noteRef, {
      bookmarkCount: increment(1),
      lastInteractionAt: Timestamp.now(),
    })
    bookmarked = true
  })

  return bookmarked
}

async function createActivity(payload) {
  await addDoc(collection(db, ACTIVITIES_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  })
}

async function pushNotification(targetUid, payload) {
  if (!targetUid) return
  await addDoc(collection(db, NOTIFICATIONS_COLLECTION, targetUid, 'items'), {
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function toggleLike({ noteId, currentUid, noteOwnerUid, actor }) {
  const likeRef = doc(db, NOTES_COLLECTION, noteId, 'likes', currentUid)
  const noteRef = doc(db, NOTES_COLLECTION, noteId)

  const now = Timestamp.now()
  let liked = false

  await runTransaction(db, async (tx) => {
    const [likeSnap, noteSnap] = await Promise.all([tx.get(likeRef), tx.get(noteRef)])
    if (!noteSnap.exists()) throw new Error('Note not found.')

    if (likeSnap.exists()) {
      tx.delete(likeRef)
      tx.update(noteRef, {
        likeCount: increment(-1),
        lastInteractionAt: now,
      })
      liked = false
      return
    }

    tx.set(likeRef, {
      userId: currentUid,
      createdAt: now,
    })
    tx.update(noteRef, {
      likeCount: increment(1),
      lastInteractionAt: now,
    })
    liked = true
  })

  await createActivity({
    type: liked ? 'like' : 'unlike',
    actorUid: currentUid,
    actorName: actor?.displayName || '',
    targetType: 'note',
    targetId: noteId,
    targetOwnerUid: noteOwnerUid,
  })

  if (liked && noteOwnerUid && noteOwnerUid !== currentUid) {
    await pushNotification(noteOwnerUid, {
      type: 'note_liked',
      actorUid: currentUid,
      actorName: actor?.displayName || actor?.username || 'Someone',
      noteId,
      message: `${actor?.displayName || actor?.username || 'Someone'} liked your note.`,
    })
  }

  return liked
}

export function subscribeComments(noteId, callback, onError, pageSize = 50) {
  const commentsQuery = query(
    collection(db, NOTES_COLLECTION, noteId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(pageSize)
  )

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: normalizeDate(data.createdAt) || new Date(),
        }
      })
      callback(comments)
    },
    onError
  )
}

export async function addComment({ noteId, currentUid, noteOwnerUid, text, parentId = null, actor }) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('Comment cannot be empty.')

  const mentions = extractMentions(trimmed)
  const mentionUids = await resolveMentionUserIds(mentions)

  const commentRef = await addDoc(collection(db, NOTES_COLLECTION, noteId, 'comments'), {
    uid: currentUid,
    parentId,
    text: trimmed,
    mentions,
    mentionUids,
    authorDisplayName: actor?.displayName || actor?.username || 'User',
    authorPhotoURL: actor?.photoURL || '',
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, NOTES_COLLECTION, noteId), {
    commentCount: increment(1),
    lastInteractionAt: serverTimestamp(),
  })

  await createActivity({
    type: 'comment',
    actorUid: currentUid,
    actorName: actor?.displayName || '',
    targetType: 'note',
    targetId: noteId,
    targetOwnerUid: noteOwnerUid,
  })

  if (noteOwnerUid && noteOwnerUid !== currentUid) {
    await pushNotification(noteOwnerUid, {
      type: 'note_commented',
      actorUid: currentUid,
      actorName: actor?.displayName || actor?.username || 'Someone',
      noteId,
      commentId: commentRef.id,
      message: `${actor?.displayName || actor?.username || 'Someone'} commented on your note.`,
    })
  }

  const mentionTargets = mentionUids.filter((uid) => uid !== currentUid && uid !== noteOwnerUid)
  await Promise.all(
    mentionTargets.map((uid) => pushNotification(uid, {
      type: 'mentioned',
      actorUid: currentUid,
      actorName: actor?.displayName || actor?.username || 'Someone',
      noteId,
      commentId: commentRef.id,
      message: `${actor?.displayName || actor?.username || 'Someone'} mentioned you in a comment.`,
    }))
  )

  return commentRef.id
}

export async function deleteComment({ noteId, commentId, currentUid }) {
  const commentRef = doc(db, NOTES_COLLECTION, noteId, 'comments', commentId)
  const snap = await getDoc(commentRef)
  if (!snap.exists()) return
  if (snap.data()?.uid !== currentUid) throw new Error('You can only delete your own comments.')

  await deleteDoc(commentRef)
  await updateDoc(doc(db, NOTES_COLLECTION, noteId), {
    commentCount: increment(-1),
    lastInteractionAt: serverTimestamp(),
  })
}

export async function searchUsersByPrefix(prefix, pageSize = 20) {
  const value = (prefix || '').trim().toLowerCase()
  if (!value) return []

  // Query the public username registry to avoid users collection permission failures
  // when private profiles exist in the same username range.
  const usernamesQuery = query(
    collection(db, USERNAMES_COLLECTION),
    where(documentId(), '>=', value),
    where(documentId(), '<=', `${value}\uf8ff`),
    orderBy(documentId()),
    limit(pageSize)
  )

  const usernameSnap = await getDocs(usernamesQuery)
  const entries = usernameSnap.docs
    .map((docSnap) => ({ username: docSnap.id, uid: docSnap.data()?.uid }))
    .filter((entry) => Boolean(entry.uid))

  const profiles = await Promise.all(
    entries.map(async ({ username, uid }) => {
      try {
        const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid))
        if (!userSnap.exists()) return null

        const data = userSnap.data()
        if (data.visibility !== 'public') return null

        return {
          id: uid,
          username: data.username || username,
          displayName: data.displayName || '',
          photoURL: data.photoURL || '',
          visibility: data.visibility || 'private',
        }
      } catch {
        return null
      }
    })
  )

  return profiles.filter(Boolean)
}

export async function searchNotesAdvanced({
  queryText = '',
  filters = {},
  sort = 'relevance',
  pageSize = 20,
  cursor = null,
} = {}) {
  const text = (queryText || '').trim().toLowerCase()
  const authorUid = filters.authorUid || null
  const queryPageSize = Math.min(80, Math.max(pageSize * 2, 30))

  let notesQuery = query(
    collection(db, NOTES_COLLECTION),
    where('visibility', '==', 'public'),
    where('deleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(queryPageSize)
  )

  if (authorUid) {
    notesQuery = query(
      collection(db, NOTES_COLLECTION),
      where('uid', '==', authorUid),
      where('visibility', '==', 'public'),
      where('deleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(queryPageSize)
    )
  }

  if (cursor) {
    if (authorUid) {
      notesQuery = query(
        collection(db, NOTES_COLLECTION),
        where('uid', '==', authorUid),
        where('visibility', '==', 'public'),
        where('deleted', '==', false),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(queryPageSize)
      )
    } else {
      notesQuery = query(
        collection(db, NOTES_COLLECTION),
        where('visibility', '==', 'public'),
        where('deleted', '==', false),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(queryPageSize)
      )
    }
  }

  const snapshot = await getDocs(notesQuery)
  let results = snapshot.docs.map(mapNote)

  if (text) {
    results = results.filter((note) => {
      const title = toText(note.title)
      const content = toText(stripHtml(note.content))
      const tags = Array.isArray(note.tags) ? note.tags.map(toText) : []
      const username = toText(note.ownerUsername)
      return (
        title.includes(text)
        || content.includes(text)
        || username.includes(text)
        || tags.some((tag) => tag.includes(text))
      )
    })
  }

  if (Array.isArray(filters.tags) && filters.tags.length) {
    const filterTags = filters.tags.map(toText)
    results = results.filter((note) => {
      const tags = Array.isArray(note.tags) ? note.tags.map(toText) : []
      return filterTags.every((tag) => tags.includes(tag))
    })
  }

  results = results.filter((note) => matchesDateRange(note, filters.dateRange))

  if (sort === 'newest') {
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } else if (sort === 'mostLiked') {
    results.sort((a, b) => Number(b.likeCount || 0) - Number(a.likeCount || 0))
  } else {
    results = results
      .map((note) => ({ ...note, relevanceScore: scoreSearchResult(note, text) }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  return {
    items: results.slice(0, pageSize),
    hasMore: snapshot.docs.length === queryPageSize,
    nextCursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null,
  }
}

export async function getSearchAutocomplete(term, pageSize = 8) {
  const text = (term || '').trim().toLowerCase()
  if (text.length < 2) {
    return { users: [], tags: [] }
  }

  const [users, latestPage] = await Promise.all([
    searchUsersByPrefix(text, pageSize),
    getLatestPublicNotesPage({ pageSize: 40 }),
  ])

  const tags = new Set()
  latestPage.items.forEach((note) => {
    if (Array.isArray(note.tags)) {
      note.tags.forEach((tag) => {
        const normalized = toText(tag)
        if (normalized.startsWith(text)) tags.add(normalized)
      })
    }
  })

  return {
    users: users.slice(0, pageSize),
    tags: [...tags].slice(0, pageSize),
  }
}

export async function getTrendingPublicNotes(hours = 24, pageSize = 50) {
  const since = Timestamp.fromDate(new Date(Date.now() - hours * 60 * 60 * 1000))
  const trendingQuery = query(
    collection(db, NOTES_COLLECTION),
    where('visibility', '==', 'public'),
    where('deleted', '==', false),
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )

  const snap = await getDocs(trendingQuery)
  return calculateTrendingNotes(snap.docs.map(mapNote))
}

export function subscribeNotifications(userId, callback, onError, pageSize = 50) {
  const notificationQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION, userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )

  return onSnapshot(
    notificationQuery,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: normalizeDate(data.createdAt) || new Date(),
        }
      })
      callback(items)
    },
    onError
  )
}

export async function getNotificationPreferences(userId) {
  const userRef = doc(db, USERS_COLLECTION, userId)
  const snapshot = await getDoc(userRef)
  const prefs = snapshot.data()?.notificationPrefs || {
    mentioned: true,
    note_liked: true,
    note_commented: true,
    trend_digest: true,
  }
  return prefs
}

export async function updateNotificationPreferences(userId, prefs) {
  await setDoc(doc(db, USERS_COLLECTION, userId), {
    notificationPrefs: {
      mentioned: Boolean(prefs.mentioned),
      note_liked: Boolean(prefs.note_liked),
      note_commented: Boolean(prefs.note_commented),
      trend_digest: Boolean(prefs.trend_digest),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function markNotificationRead(userId, notificationId, read = true) {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, userId, 'items', notificationId), { read })
}

export async function markAllNotificationsRead(userId) {
  const unreadQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION, userId, 'items'),
    where('read', '==', false),
    limit(500)
  )
  const snap = await getDocs(unreadQuery)
  if (snap.empty) return

  for (let i = 0; i < snap.docs.length; i += MAX_BATCH_WRITES) {
    const chunk = snap.docs.slice(i, i + MAX_BATCH_WRITES)
    const batch = writeBatch(db)
    chunk.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true })
    })
    await batch.commit()
  }
}
