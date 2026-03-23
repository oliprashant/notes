// src/firebase/firestore.js
// ──────────────────────────────────────────────────────────────
// Firestore data access helpers for notes.
// All operations are scoped to the authenticated user's uid.
// ──────────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from './config'

const NOTES_COLLECTION = 'notes'
const USERS_COLLECTION = 'users'

/**
 * Subscribe to all notes belonging to a user, ordered by updatedAt descending.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {string}   uid       - Firebase user uid
 * @param {string}   userEmail - Firebase user email
 * @param {Function} onData    - called with array of note objects
 * @param {Function} onError   - called with error
 */
export function subscribeToNotes(uid, userEmail, onData, onError) {
  const query1 = query(
    collection(db, NOTES_COLLECTION),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc')
  )

  const query2 = userEmail
    ? query(
        collection(db, NOTES_COLLECTION),
        where('collaborators', 'array-contains', userEmail),
        orderBy('updatedAt', 'desc')
      )
    : null

  const mapSnapshotDocs = (snapshot) => snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    // Convert Firestore Timestamps to JS Date for easy use
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
    deletedAt: d.data().deletedAt?.toDate?.() ?? null,
  }))

  let ownedNotes = []
  let sharedNotes = []

  const emitMergedNotes = () => {
    const deduped = new Map()
    ;[...ownedNotes, ...sharedNotes].forEach((note) => {
      deduped.set(note.id, note)
    })

    const merged = Array.from(deduped.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    onData(merged)
  }

  const unsubscribeOwned = onSnapshot(
    query1,
    (snapshot) => {
      ownedNotes = mapSnapshotDocs(snapshot)
      emitMergedNotes()
    },
    onError
  )

  const unsubscribeShared = query2
    ? onSnapshot(
        query2,
        (snapshot) => {
          sharedNotes = mapSnapshotDocs(snapshot)
          emitMergedNotes()
        },
        onError
      )
    : () => {}

  return () => {
    unsubscribeOwned()
    unsubscribeShared()
  }
}

/**
 * Create a new note.
 *
 * @param {string} uid
 * @param {{ title: string, content: string }} fields
 * @returns {Promise<string>} the new note's document ID
 */
export async function createNote(uid, { title = 'Untitled', content = '' } = {}) {
  const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
    uid,
    title,
    content,
    collaborators: [],
    tags: [],
    pinned: false,
    favourite: false,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Update an existing note's title and/or content.
 *
 * @param {string} noteId
 * @param {{ title?: string, content?: string }} fields
 */
export async function updateNote(noteId, fields) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Toggle pin state for a note.
 *
 * @param {string} noteId
 * @param {boolean} pinned
 */
export async function pinNote(noteId, pinned) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    pinned,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Toggle favourite state for a note.
 *
 * @param {string} noteId
 * @param {boolean} favourite
 */
export async function favouriteNote(noteId, favourite) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    favourite,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Set color for a note.
 *
 * @param {string} noteId
 * @param {string | null} color
 */
export async function setNoteColor(noteId, color) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    color,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Update tags for a note.
 *
 * @param {string} noteId
 * @param {string[]} tags
 */
export async function updateNoteTags(noteId, tags) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    tags,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Add a collaborator email to a note.
 *
 * @param {string} noteId
 * @param {string} email
 */
export async function addCollaborator(noteId, email) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    collaborators: arrayUnion(email),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove a collaborator email from a note.
 *
 * @param {string} noteId
 * @param {string} email
 */
export async function removeCollaborator(noteId, email) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    collaborators: arrayRemove(email),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Toggle lock state for a note.
 *
 * @param {string} noteId
 * @param {boolean} locked
 */
export async function toggleNoteLock(noteId, locked) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, { locked })
}

/**
 * Share a note by setting shared=true and recording the timestamp.
 *
 * @param {string} noteId
 */
export async function shareNote(noteId) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    shared: true,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Unshare a note by setting shared=false.
 *
 * @param {string} noteId
 */
export async function unshareNote(noteId) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    shared: false,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Save a history snapshot for a note.
 * Stored under notes/{noteId}/history/{timestamp}.
 *
 * @param {string} noteId
 * @param {string} uid
 * @param {string} title
 * @param {string} content
 */
export async function saveNoteHistory(noteId, uid, title, content) {
  const timestampId = `${Date.now()}`
  const historyRef = doc(db, NOTES_COLLECTION, noteId, 'history', timestampId)

  await setDoc(historyRef, {
    title,
    content,
    savedAt: serverTimestamp(),
    uid,
  })

  // Keep only the newest 100 snapshots per note.
  const historyQuery = query(
    collection(db, NOTES_COLLECTION, noteId, 'history'),
    orderBy('savedAt', 'desc')
  )

  const historySnapshot = await getDocs(historyQuery)
  const staleDocs = historySnapshot.docs.slice(100)
  await Promise.all(staleDocs.map((snapshotDoc) => deleteDoc(snapshotDoc.ref)))
}

/**
 * Fetch note history snapshots in reverse chronological order.
 *
 * @param {string} noteId
 * @returns {Promise<Array<{ id: string, title: string, content: string, savedAt: Date | null }>>}
 */
export async function getNoteHistory(noteId) {
  const historyQuery = query(
    collection(db, NOTES_COLLECTION, noteId, 'history'),
    orderBy('savedAt', 'desc')
  )

  const snapshot = await getDocs(historyQuery)
  return snapshot.docs.map((d) => ({
    id: d.id,
    title: d.data().title ?? 'Untitled',
    content: d.data().content ?? '',
    savedAt: d.data().savedAt?.toDate?.() ?? null,
  }))
}

/**
 * Soft-delete a note by moving it to trash.
 *
 * @param {string} noteId
 */
export async function softDeleteNote(noteId) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Restore a soft-deleted note from trash.
 *
 * @param {string} noteId
 */
export async function restoreNote(noteId) {
  const ref = doc(db, NOTES_COLLECTION, noteId)
  await updateDoc(ref, {
    deleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Permanently delete a note.
 *
 * @param {string} noteId
 */
export async function deleteNote(noteId) {
  await deleteDoc(doc(db, NOTES_COLLECTION, noteId))
}

/**
 * Fetch a user's profile document.
 *
 * @param {string} uid
 * @returns {Promise<{ displayName?: string, hobby?: string } | null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return {}
  const ref = doc(db, USERS_COLLECTION, uid)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return {}
  return snapshot.data()
}

/**
 * Upsert profile fields for a user.
 *
 * @param {string} uid
 * @param {{ displayName?: string, hobby?: string }} profile
 */
export async function saveUserProfile(uid, profile) {
  if (!uid) {
    throw new Error('User is not authenticated.')
  }

  const ref = doc(db, USERS_COLLECTION, uid)
  await setDoc(ref, profile, { merge: true })
}
