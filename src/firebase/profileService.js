import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  onSnapshot,
  updateDoc,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import {
  calculateProfileCompleteness,
  checkEarnedBadges,
  hasSevenDayStreak as sharedHasSevenDayStreak,
} from '../utils/socialHelpers'

const USERS_COLLECTION = 'users'
const USERNAMES_COLLECTION = 'usernames'
const NOTES_COLLECTION = 'notes'
const FOLLOWERS_COLLECTION = 'followers'
const FOLLOWING_COLLECTION = 'following'
const SESSIONS_COLLECTION = 'sessions'

export const BADGE_DEFINITIONS = {
  firstNote: {
    key: 'firstNote',
    title: 'First Note',
    description: 'Create your first note.',
    color: 'from-emerald-400 to-teal-500',
  },
  noteCollector10: {
    key: 'noteCollector10',
    title: 'Note Collector 10',
    description: 'Own at least 10 notes.',
    color: 'from-blue-400 to-indigo-500',
  },
  noteCollector50: {
    key: 'noteCollector50',
    title: 'Note Collector 50',
    description: 'Own at least 50 notes.',
    color: 'from-indigo-400 to-purple-500',
  },
  noteCollector100: {
    key: 'noteCollector100',
    title: 'Note Collector 100',
    description: 'Own at least 100 notes.',
    color: 'from-purple-500 to-fuchsia-500',
  },
  streak7: {
    key: 'streak7',
    title: '7 Day Streak',
    description: 'Active for 7 consecutive days.',
    color: 'from-amber-400 to-orange-500',
  },
  socialButterfly: {
    key: 'socialButterfly',
    title: 'Social Butterfly',
    description: 'Link all social profiles.',
    color: 'from-pink-400 to-rose-500',
  },
  profilePro: {
    key: 'profilePro',
    title: 'Profile Pro',
    description: 'Reach 100% profile completeness.',
    color: 'from-sky-400 to-cyan-500',
  },
}

/**
 * Normalize username for consistent comparisons.
 * @param {string} value
 */
export function normalizeUsername(value) {
  return value.replace(/^@+/, '').trim().toLowerCase()
}

/**
 * Validate username against app constraints.
 * @param {string} value
 */
export function validateUsername(value) {
  const normalized = normalizeUsername(value)
  if (!normalized) return 'Username is required.'
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return 'Username must be 3-20 chars, lowercase letters, numbers, or underscore.'
  }
  return ''
}

/**
 * Validate optional URL. Empty string is allowed.
 * @param {string} value
 */
export function validateOptionalUrl(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return ['http:', 'https:'].includes(url.protocol) ? '' : 'URL must use http or https.'
  } catch {
    return 'Please enter a valid URL.'
  }
}

/**
 * Ensure URL has protocol for outbound links.
 * @param {string} value
 */
export function normalizeUrl(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
}

function isPermissionDenied(error) {
  return (
    error?.code === 'permission-denied'
    || /insufficient permissions/i.test(error?.message || '')
  )
}

export async function getUserProfileById(userId) {
  try {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, userId))
    if (!snapshot.exists()) return null
    return snapshot.data()
  } catch (error) {
    if (isPermissionDenied(error)) return null
    throw error
  }
}

export async function checkUsernameAvailability(username, currentUid) {
  const normalized = normalizeUsername(username)
  const validationError = validateUsername(normalized)
  if (validationError) {
    return { available: false, reason: validationError }
  }

  const snapshot = await getDoc(doc(db, USERNAMES_COLLECTION, normalized))
  if (!snapshot.exists()) return { available: true, normalized }
  const ownerUid = snapshot.data()?.uid
  if (ownerUid === currentUid) return { available: true, normalized }
  return { available: false, normalized, reason: 'Username is already taken.' }
}

/**
 * Save profile and reserve username atomically.
 */
export async function saveProfileWithUsername(uid, profileData, nextUsername, previousUsername = '') {
  const normalizedNext = normalizeUsername(nextUsername)
  const normalizedPrev = normalizeUsername(previousUsername)

  await runTransaction(db, async (transaction) => {
    const profileRef = doc(db, USERS_COLLECTION, uid)
    const previousUsernameRef = normalizedPrev ? doc(db, USERNAMES_COLLECTION, normalizedPrev) : null
    const nextUsernameRef = doc(db, USERNAMES_COLLECTION, normalizedNext)

    const profileSnap = await transaction.get(profileRef)
    const nextUsernameSnap = await transaction.get(nextUsernameRef)

    if (nextUsernameSnap.exists() && nextUsernameSnap.data()?.uid !== uid) {
      throw new Error('Username is already taken.')
    }

    if (previousUsernameRef && normalizedPrev !== normalizedNext) {
      const prevSnap = await transaction.get(previousUsernameRef)
      if (prevSnap.exists() && prevSnap.data()?.uid === uid) {
        transaction.delete(previousUsernameRef)
      }
    }

    transaction.set(nextUsernameRef, {
      uid,
      createdAt: serverTimestamp(),
    }, { merge: true })

    const createdAt = profileSnap.exists() ? profileSnap.data()?.createdAt ?? serverTimestamp() : serverTimestamp()

    transaction.set(profileRef, {
      ...profileData,
      username: normalizedNext,
      createdAt,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  })
}

export async function getNotesAggregate(uid) {
  const noteQuery = query(collection(db, NOTES_COLLECTION), where('uid', '==', uid))
  const snapshot = await getDocs(noteQuery)

  let totalWords = 0
  let totalBytes = 0
  const activeDays = new Set()

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const title = data.title || ''
    const content = data.content || ''
    const combined = `${title} ${content}`.trim()
    if (combined) {
      totalWords += combined.split(/\s+/).filter(Boolean).length
      totalBytes += new Blob([combined]).size
    }

    const updatedAt = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.()
    if (updatedAt) {
      const day = updatedAt.toISOString().slice(0, 10)
      activeDays.add(day)
    }
  })

  const countAggregate = await getCountFromServer(noteQuery)

  return {
    notesCount: countAggregate.data().count ?? 0,
    totalWords,
    totalBytes,
    activeDays: Array.from(activeDays).sort(),
  }
}

export function hasSevenDayStreak(activeDays) {
  return sharedHasSevenDayStreak(activeDays)
}

export async function getFollowerFollowingCounts(userId) {
  const [followersAgg, followingAgg] = await Promise.all([
    getCountFromServer(collection(db, FOLLOWERS_COLLECTION, userId, 'userFollowers')),
    getCountFromServer(collection(db, FOLLOWING_COLLECTION, userId, 'userFollowing')),
  ])

  return {
    followersCount: followersAgg.data().count ?? 0,
    followingCount: followingAgg.data().count ?? 0,
  }
}

export async function checkIsFollowing(currentUid, profileUid) {
  if (!currentUid || !profileUid || currentUid === profileUid) return false
  const followRef = doc(db, FOLLOWING_COLLECTION, currentUid, 'userFollowing', profileUid)
  const snap = await getDoc(followRef)
  return snap.exists()
}

export async function followUser(currentUid, profileUid) {
  if (!currentUid || !profileUid || currentUid === profileUid) return
  const batch = writeBatch(db)
  const followingRef = doc(db, FOLLOWING_COLLECTION, currentUid, 'userFollowing', profileUid)
  const followerRef = doc(db, FOLLOWERS_COLLECTION, profileUid, 'userFollowers', currentUid)
  const currentUserRef = doc(db, USERS_COLLECTION, currentUid)
  const targetUserRef = doc(db, USERS_COLLECTION, profileUid)

  batch.set(followingRef, {
    followerId: currentUid,
    followedId: profileUid,
    createdAt: serverTimestamp(),
  }, { merge: true })

  batch.set(followerRef, {
    followerId: currentUid,
    followedId: profileUid,
    createdAt: serverTimestamp(),
  }, { merge: true })

  batch.set(currentUserRef, {
    followingCount: increment(1),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  batch.set(targetUserRef, {
    followersCount: increment(1),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  await batch.commit()
}

export async function unfollowUser(currentUid, profileUid) {
  if (!currentUid || !profileUid || currentUid === profileUid) return
  const batch = writeBatch(db)
  batch.delete(doc(db, FOLLOWING_COLLECTION, currentUid, 'userFollowing', profileUid))
  batch.delete(doc(db, FOLLOWERS_COLLECTION, profileUid, 'userFollowers', currentUid))

  batch.set(doc(db, USERS_COLLECTION, currentUid), {
    followingCount: increment(-1),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  batch.set(doc(db, USERS_COLLECTION, profileUid), {
    followersCount: increment(-1),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  await batch.commit()
}

export async function getUserBadges(uid) {
  const badgesQuery = query(collection(db, USERS_COLLECTION, uid, 'badges'), orderBy('earnedAt', 'desc'))
  const snapshot = await getDocs(badgesQuery)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function syncBadges(uid, profile, aggregate, completenessPercent) {
  const candidateKeys = checkEarnedBadges({
    profile,
    notesCount: aggregate.notesCount,
    activeDays: aggregate.activeDays,
    completenessPercent,
  })

  const batch = writeBatch(db)

  candidateKeys.forEach((key) => {
    batch.set(doc(db, USERS_COLLECTION, uid, 'badges', key), {
      key,
      title: BADGE_DEFINITIONS[key].title,
      description: BADGE_DEFINITIONS[key].description,
      earnedAt: serverTimestamp(),
    }, { merge: true })
  })

  if (candidateKeys.length > 0) {
    await batch.commit()
  }
}

export async function listActiveSessions(uid) {
  const sessionsQuery = query(
    collection(db, SESSIONS_COLLECTION, uid, 'userSessions'),
    orderBy('lastActive', 'desc'),
    limit(20)
  )

  const snapshot = await getDocs(sessionsQuery)
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((session) => !session.revoked)
}

export async function revokeSession(uid, sessionId) {
  const ref = doc(db, SESSIONS_COLLECTION, uid, 'userSessions', sessionId)
  await setDoc(ref, {
    revoked: true,
    revokedAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  }, { merge: true })
}

export async function recordLoginHeartbeat(uid, metadata = {}) {
  const sessionId = metadata.sessionId || getOrCreateSessionId(uid)
  await Promise.all([
    setDoc(doc(db, USERS_COLLECTION, uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true }),
    setDoc(doc(db, SESSIONS_COLLECTION, uid, 'userSessions', sessionId), {
      uid,
      sessionId,
      device: metadata.device || 'Unknown device',
      browser: metadata.browser || 'Unknown browser',
      ip: metadata.ip || null,
      revoked: false,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    }, { merge: true }),
  ])
}

export async function upsertSessionPresence(uid, sessionId, metadata = {}) {
  const ref = doc(db, SESSIONS_COLLECTION, uid, 'userSessions', sessionId)
  await setDoc(ref, {
    sessionId,
    uid,
    ...metadata,
    revoked: false,
    lastActive: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true })
}

export async function removeSession(uid, sessionId) {
  await deleteDoc(doc(db, SESSIONS_COLLECTION, uid, 'userSessions', sessionId))
}

export async function upsertLastLogin(uid) {
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export function getOrCreateSessionId(uid) {
  const key = `noteflow_session_${uid}`
  let value = localStorage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    localStorage.setItem(key, value)
  }
  return value
}

/**
 * Subscribe to the current client session and notify when revoked.
 */
export function subscribeToSessionRevocation(uid, sessionId, onRevoked) {
  const sessionRef = doc(db, SESSIONS_COLLECTION, uid, 'userSessions', sessionId)
  return onSnapshot(sessionRef, (snapshot) => {
    if (!snapshot.exists()) return
    if (snapshot.data()?.revoked === true) {
      onRevoked?.()
    }
  })
}

export function calculateCompleteness(profile) {
  return calculateProfileCompleteness(profile)
}
