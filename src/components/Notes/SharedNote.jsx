// src/components/Notes/SharedNote.jsx
// ──────────────────────────────────────────────────────────────
// Public read-only page for viewing shared notes.
// No authentication required.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { PenLine } from 'lucide-react'
import { useDarkMode } from '../../hooks/useDarkMode'

export default function SharedNote({ noteId }) {
  const [note, setNote] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const { isDark } = useDarkMode()

  useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'notes', noteId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setNotFound(true)
          setLoading(false)
          return
        }

        const data = docSnap.data()

        // Only show if the note is shared
        if (!data.shared) {
          setNotFound(true)
          setLoading(false)
          return
        }

        setNote({
          id: docSnap.id,
          ...data,
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching shared note:', err)
        setNotFound(true)
        setLoading(false)
      }
    }

    fetchNote()
  }, [noteId])

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-parchment-50'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin`} />
          <p className={`text-sm font-medium ${isDark ? 'text-dark-text' : 'text-ink'}`}>Loading…</p>
        </div>
      </div>
    )
  }

  if (notFound || !note) {
    return (
      <div className={`h-full flex flex-col items-center justify-center gap-4 px-4 ${isDark ? 'bg-dark-bg' : 'bg-parchment-50'}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-dark-hover' : 'bg-parchment-200'}`}>
          <PenLine size={24} className={isDark ? 'text-dark-muted' : 'text-ink-muted'} />
        </div>
        <div className="text-center">
          <p className={`font-medium mb-1 ${isDark ? 'text-dark-text' : 'text-ink'}`}>This note is not available</p>
          <p className={`text-sm ${isDark ? 'text-dark-muted' : 'text-ink-muted'}`}>
            The note may have been deleted or is no longer shared.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-dark-bg text-dark-text' : 'bg-parchment-50 text-ink'}`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-dark-border bg-dark-bg' : 'border-parchment-200 bg-parchment-50'} px-4 py-4 flex-shrink-0`}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-sage flex items-center justify-center flex-shrink-0">
            <PenLine size={14} className="text-white" />
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight">NoteFlow</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-8">
          {/* Title */}
          <h1 className="w-full font-serif text-4xl font-semibold mb-8 leading-tight">
            {note.title || 'Untitled'}
          </h1>

          {/* Content */}
          <div className="prose-note">
            <div
              dangerouslySetInnerHTML={{
                __html: note.content || '<p></p>',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`border-t ${isDark ? 'border-dark-border' : 'border-parchment-200'} px-4 py-3 flex-shrink-0 text-center`}>
        <p className={`text-xs ${isDark ? 'text-dark-muted' : 'text-ink-muted'}`}>
          Shared with you via NoteFlow
        </p>
      </div>
    </div>
  )
}
