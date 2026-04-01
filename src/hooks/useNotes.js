// src/hooks/useNotes.js
// ──────────────────────────────────────────────────────────────
// Custom hook that manages the notes state with real-time Firestore
// sync. Exposes CRUD operations for use in components.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  subscribeToNotes,
  createNote,
  updateNote,
  deleteNote,
  softDeleteNote,
  restoreNote,
  pinNote,
  favouriteNote,
  shareNote,
  unshareNote,
  updateNoteTags,
  addCollaborator as addCollaboratorToNote,
  removeCollaborator as removeCollaboratorFromNote,
  toggleNoteLock,
  saveNoteHistory,
  getNoteHistory,
} from '../firebase/firestore'

const HISTORY_SAVE_DEBOUNCE_MS = 30000
const SIGNIFICANT_CONTENT_DIFF = 50

export function useNotes(user) {
  const [notes, setNotes]       = useState([])
  const [trashedNotes, setTrashedNotes] = useState([])
  const [lastHistorySavedAtByNote, setLastHistorySavedAtByNote] = useState({})
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const historyTimerRef = useRef({})

  // Real-time subscription — re-subscribes whenever the user changes
  useEffect(() => {
    if (!user) {
      setNotes([])
      setTrashedNotes([])
      setLastHistorySavedAtByNote({})
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToNotes(
      user.uid,
      user.email,
      (updatedNotes) => {
        const activeNotes = updatedNotes.filter(note => note.deleted !== true)
        const trashed = updatedNotes
          .filter(note => note.deleted === true)
          .sort((a, b) => new Date(b.deletedAt || b.updatedAt).getTime() - new Date(a.deletedAt || a.updatedAt).getTime())

        const sortedNotes = [...activeNotes].sort((a, b) => {
          const aPinned = a.pinned ? 1 : 0
          const bPinned = b.pinned ? 1 : 0
          if (aPinned !== bPinned) return bPinned - aPinned
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })

        setNotes(sortedNotes)
        setTrashedNotes(trashed)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [user])

  useEffect(() => {
    return () => {
      Object.values(historyTimerRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  /** Create a new blank note and return its id */
  const addNote = useCallback(
    async (fields = {}) => {
      if (!user) return null
      setError(null)
      try {
        return await createNote(user.uid, fields)
      } catch (err) {
        setError(err.message)
        return null
      }
    },
    [user]
  )

  /** Update a note's title/content */
  const editNote = useCallback(async (noteId, fields) => {
    setError(null)
    try {
      await updateNote(noteId, fields)

      const hasContentUpdate = typeof fields.content === 'string'
      if (!hasContentUpdate || !user) return

      const existingNote = notes.find((n) => n.id === noteId)
      const oldContentLength = existingNote?.content?.length ?? 0
      const newContentLength = fields.content.length
      const significant = Math.abs(newContentLength - oldContentLength) > SIGNIFICANT_CONTENT_DIFF
      if (!significant) return

      clearTimeout(historyTimerRef.current[noteId])
      historyTimerRef.current[noteId] = setTimeout(() => {
        saveNoteHistory(
          noteId,
          user.uid,
          typeof fields.title === 'string' ? fields.title : (existingNote?.title ?? 'Untitled'),
          fields.content
        )
          .then(() => {
            setLastHistorySavedAtByNote((prev) => ({
              ...prev,
              [noteId]: new Date(),
            }))
          })
          .catch(() => {
            // Non-blocking best-effort snapshot save.
          })
      }, HISTORY_SAVE_DEBOUNCE_MS)
    } catch (err) {
      setError(err.message)
    }
  }, [notes, user])

  /** Move a note to trash */
  const removeNote = useCallback(async (noteId) => {
    setError(null)
    try {
      await softDeleteNote(noteId)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])

  /** Restore a note from trash */
  const undeleteNote = useCallback(async (noteId) => {
    setError(null)
    try {
      await restoreNote(noteId)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Permanently delete a note */
  const permanentDelete = useCallback(async (noteId) => {
    setError(null)
    try {
      await deleteNote(noteId)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Toggle a note's pinned state */
  const togglePin = useCallback(async (noteId, currentVal) => {
    setError(null)
    try {
      await pinNote(noteId, !currentVal)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Toggle a note's favourite state */
  const toggleFavourite = useCallback(async (noteId, currentVal) => {
    setError(null)
    try {
      await favouriteNote(noteId, !currentVal)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Toggle a note's shared state */
  const toggleShare = useCallback(async (noteId, currentVal) => {
    setError(null)
    try {
      if (currentVal) {
        await unshareNote(noteId)
      } else {
        await shareNote(noteId)
      }
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])

  /** Update note tags */
  const updateTags = useCallback(async (noteId, tags) => {
    setError(null)
    try {
      await updateNoteTags(noteId, tags)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Fetch history snapshots for a note */
  const fetchHistory = useCallback(async (noteId) => {
    setError(null)
    try {
      return await getNoteHistory(noteId)
    } catch (err) {
      setError(err.message)
      return []
    }
  }, [])

  /** Add collaborator by email */
  const addCollaborator = useCallback(async (noteId, email) => {
    setError(null)
    try {
      await addCollaboratorToNote(noteId, email)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Remove collaborator by email */
  const removeCollaborator = useCallback(async (noteId, email) => {
    setError(null)
    try {
      await removeCollaboratorFromNote(noteId, email)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  /** Toggle lock state for a note */
  const toggleLock = useCallback(async (noteId, currentLocked) => {
    setError(null)
    try {
      await toggleNoteLock(noteId, !currentLocked)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])

  /** Import multiple files as notes */
  const importFiles = useCallback(
    async (files) => {
      if (!user) return
      const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

      const results = []
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          results.push({ name: file.name, success: false, reason: 'File exceeds 5 MB limit' })
          continue
        }

        const supportedTypes = ['text/plain', 'text/markdown', 'application/pdf', '']
        const ext = file.name.split('.').pop().toLowerCase()
        const supported = ['txt', 'md', 'markdown'].includes(ext)

        if (!supported) {
          results.push({ name: file.name, success: false, reason: 'Unsupported file type' })
          continue
        }

        try {
          const content = await readFileAsText(file)
          // Use filename (without extension) as note title
          const title = file.name.replace(/\.(txt|md|markdown)$/i, '')
          await createNote(user.uid, { title, content })
          results.push({ name: file.name, success: true })
        } catch (err) {
          results.push({ name: file.name, success: false, reason: err.message })
        }
      }

      return results
    },
    [user]
  )

  return {
    notes,
    trashedNotes,
    lastHistorySavedAtByNote,
    loading,
    error,
    addNote,
    editNote,
    removeNote,
    undeleteNote,
    permanentDelete,
    togglePin,
    toggleFavourite,
    toggleShare,
    updateTags,
    fetchHistory,
    addCollaborator,
    removeCollaborator,
    toggleLock,
    importFiles,
  }
}

/** Helper: read a File object as a UTF-8 string */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'UTF-8')
  })
}
