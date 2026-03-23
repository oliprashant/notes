// src/App.jsx
// ──────────────────────────────────────────────────────────────
// Root component. Handles auth state, routing between login and
// main app, and layout composition.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useAuth }    from './hooks/useAuth'
import { useNotes }   from './hooks/useNotes'
import { useDarkMode } from './hooks/useDarkMode'
import LoginPage      from './components/Auth/LoginPage'
import NoteList       from './components/Notes/NoteList'
import NoteEditor     from './components/Notes/NoteEditor'
import LockScreen     from './components/Notes/LockScreen'
import HomePage       from './components/Home/HomePage'
import SharedNote     from './components/Notes/SharedNote'
import AIAssistant    from './components/AI/AIAssistant'
import FileImport     from './components/Import/FileImport'
import GuestBanner    from './components/GuestBanner'
import CookieBanner   from './components/CookieBanner'
import {
  PenLine, BotMessageSquare, Upload, LogOut, Home, Lock, Plus, User,
  Menu, X, Search, Sun, Moon, Trash2, Clock
} from 'lucide-react'

export default function App() {
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signInAsGuest,
    isGuest,
    signOutUser,
  } = useAuth()
  const {
    notes,
    trashedNotes,
    lastHistorySavedAtByNote,
    loading: notesLoading,
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
  } = useNotes(user)
  const { isDark, toggleDarkMode } = useDarkMode()

  // Currently selected note ID
  const [selectedId, setSelectedId]   = useState(null)
  const [currentView, setCurrentView] = useState('home')
  const [masterPinSet, setMasterPinSet] = useState(Boolean(localStorage.getItem('noteflow_master_pin')))
  const [unlockedNoteIds, setUnlockedNoteIds] = useState([])
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinEntry, setShowPinEntry] = useState(false)
  const [pendingLockNoteId, setPendingLockNoteId] = useState(null)
  // AI panel open state
  const [aiOpen, setAiOpen]           = useState(false)
  // Import modal open state
  const [importOpen, setImportOpen]   = useState(false)
  // Trash panel open state
  const [trashOpen, setTrashOpen]     = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [noteHistory, setNoteHistory] = useState([])
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)
  // Mobile sidebar open
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Search query for filtering notes
  const [searchQuery, setSearchQuery] = useState('')
  // Active tag filter
  const [selectedTag, setSelectedTag] = useState(null)
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false)

  // Auto-select the first note when notes load
  useEffect(() => {
    if (notes.length > 0 && !selectedId) {
      setSelectedId(notes[0].id)
    }
    // If selected note was deleted, clear selection
    if (selectedId && notes.length > 0 && !notes.find(n => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null)
    }
  }, [notes])

  useEffect(() => {
    if (user) {
      setCurrentView('home')
    }
  }, [user])

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedNote) return
    if (selectedNote.locked && !unlockedNoteIds.includes(selectedNote.id)) {
      setShowPinEntry(true)
    }
  }, [selectedNote, unlockedNoteIds])

  useEffect(() => {
    if (isGuest && aiOpen) {
      setAiOpen(false)
    }
  }, [isGuest, aiOpen])

  useEffect(() => {
    if (isGuest) {
      setGuestBannerDismissed(false)
    }
  }, [isGuest])

  // ── Shared note routing ──────────────────────────────────────
  const pathname = window.location.pathname
  const sharedMatch = pathname.match(/^\/shared\/([^/]+)$/)
  
  if (sharedMatch) {
    const noteId = sharedMatch[1]
    return <SharedNote noteId={noteId} />
  }

  // ── Loading splash ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-parchment-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-muted dark:text-dark-muted font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Not signed in ────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <LoginPage
          onGoogleSignIn={signInWithGoogle}
          onEmailSignIn={signInWithEmail}
          onEmailSignUp={signUpWithEmail}
          onPasswordReset={resetPassword}
          onGuestSignIn={signInAsGuest}
        />
        <CookieBanner />
      </>
    )
  }

  // ── Helpers ──────────────────────────────────────────────────

  const handleNewNote = async () => {
    const id = await addNote({ title: 'Untitled', content: '' })
    if (id) {
      setSelectedId(id)
      setCurrentView('editor')
      setSidebarOpen(false)
    }
  }

  const handleSelectNote = (id) => {
    const targetNote = notes.find((note) => note.id === id)
    setSelectedId(id)
    setCurrentView('editor')
    if (targetNote?.locked && !unlockedNoteIds.includes(targetNote.id)) {
      setShowPinEntry(true)
    } else {
      setShowPinEntry(false)
    }
    setSidebarOpen(false)
  }

  const handleBrowseAllNotes = () => {
    setCurrentView('editor')
    if (selectedNote?.locked && !unlockedNoteIds.includes(selectedNote.id)) {
      setShowPinEntry(true)
    }
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id)
    }
  }

  const handleDeleteNote = async (id) => {
    await removeNote(id)
    if (selectedId === id) {
      const remaining = notes.filter(n => n.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    setUnlockedNoteIds((prev) => prev.filter((noteId) => noteId !== id))
  }

  const handleToggleLock = async (noteId, currentLocked) => {
    if (!currentLocked && !masterPinSet) {
      setPendingLockNoteId(noteId)
      setShowPinSetup(true)
      return
    }

    await toggleLock(noteId, currentLocked)
    if (currentLocked) {
      // Note was unlocked at data level; clear any transient unlock marker.
      setUnlockedNoteIds((prev) => prev.filter((id) => id !== noteId))
    } else {
      // Newly locked note should require PIN again.
      setUnlockedNoteIds((prev) => prev.filter((id) => id !== noteId))
    }
  }

  const handlePinSetupSuccess = async () => {
    setMasterPinSet(true)
    setShowPinSetup(false)

    if (pendingLockNoteId) {
      await toggleLock(pendingLockNoteId, false)
      setUnlockedNoteIds((prev) => prev.filter((id) => id !== pendingLockNoteId))
      setPendingLockNoteId(null)
    }
  }

  const handleSessionUnlock = (noteId) => {
    if (!noteId) return
    setUnlockedNoteIds((prev) => (prev.includes(noteId) ? prev : [...prev, noteId]))
    setShowPinEntry(false)
  }

  const handleOpenHistory = async () => {
    if (!selectedNote) return
    setHistoryLoading(true)
    const snapshots = await fetchHistory(selectedNote.id)
    setNoteHistory(snapshots)
    setSelectedHistoryId(snapshots[0]?.id ?? null)
    setHistoryOpen(true)
    setHistoryLoading(false)
  }

  const activeSnapshot = noteHistory.find((item) => item.id === selectedHistoryId) ?? null

  const handleRestoreHistory = async () => {
    if (!selectedNote || !activeSnapshot) return
    await editNote(selectedNote.id, {
      title: activeSnapshot.title,
      content: activeSnapshot.content,
    })
    setHistoryOpen(false)
  }

  const tagFilteredNotes = selectedTag
    ? notes.filter(n => Array.isArray(n.tags) && n.tags.includes(selectedTag))
    : notes

  const filteredNotes = searchQuery.trim()
    ? tagFilteredNotes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tagFilteredNotes

  const hasLockedNotes = notes.some((note) => note.locked)
  const isSelectedLocked = Boolean(
    selectedNote?.locked && !unlockedNoteIds.includes(selectedNote.id) && showPinEntry
  )

  // ── Main app layout ──────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-parchment-50 dark:bg-dark-bg text-ink dark:text-dark-text">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="h-14 border-b border-parchment-200 dark:border-dark-border bg-parchment-50 dark:bg-dark-bg flex items-center px-4 gap-3 flex-shrink-0 z-20">
        {/* Mobile menu toggle */}
        {currentView === 'editor' && (
          <button
            className="lg:hidden p-1.5 rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-md bg-sage flex items-center justify-center">
            <PenLine size={14} className="text-white" />
          </div>
          <span className="font-serif font-semibold text-ink dark:text-dark-text text-lg tracking-tight hidden sm:block">
            NoteFlow
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${currentView === 'home'
                ? 'bg-sage text-white'
                : 'text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover'
              }`}
            aria-label="Go to home dashboard"
            title="Home"
          >
            <Home size={15} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Import */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-light dark:text-dark-text
                       rounded-md hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
            aria-label="Import files"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* AI toggle */}
          {!isGuest && (
            <button
              onClick={() => setAiOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${aiOpen
                  ? 'bg-sage text-white'
                  : 'text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover'
                }`}
              aria-label="Toggle AI assistant"
              aria-pressed={aiOpen}
            >
              <BotMessageSquare size={15} />
              <span className="hidden sm:inline">AI</span>
            </button>
          )}

          {!isGuest && (
            <button
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
              aria-label="Open note history"
              title="History"
              disabled={!selectedNote || historyLoading}
            >
              <Clock size={15} />
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          {isGuest && (
            <button
              onClick={handleNewNote}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
              aria-label="Create new note"
              title="New Note"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Note</span>
            </button>
          )}

          {hasLockedNotes && (
            <button
              onClick={() => {
                setUnlockedNoteIds([])
                if (selectedNote?.locked) {
                  setShowPinEntry(true)
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                unlockedNoteIds.length > 0
                  ? 'bg-sage text-white hover:bg-sage-light'
                  : 'text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover'
              }`}
              aria-label="Lock session"
              title="Lock session"
            >
              <Lock size={15} />
              <span className="hidden sm:inline">Lock Session</span>
            </button>
          )}

          {/* Trash */}
          <button
            onClick={() => setTrashOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md text-ink-light dark:text-dark-text hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors"
            aria-label="Open trash"
            title="Trash"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">Trash</span>
          </button>

          {/* User + sign out */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-parchment-200 dark:border-dark-border">
            {isGuest ? (
              <div className="w-7 h-7 rounded-full bg-parchment-200 dark:bg-dark-hover flex items-center justify-center">
                <User size={14} className="text-ink-muted dark:text-dark-muted" />
              </div>
            ) : (
              user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'User avatar'}
                  className="w-7 h-7 rounded-full"
                />
              )
            )}

            {isGuest && (
              <button
                onClick={signOutUser}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-sage text-white hover:bg-sage-light transition-colors"
                title="Create account"
                aria-label="Sign up"
              >
                Sign Up
              </button>
            )}

            <button
              onClick={signOutUser}
              className="p-1.5 rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover hover:text-ink dark:hover:text-dark-text transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {isGuest && !guestBannerDismissed && (
        <GuestBanner
          onSignUp={signOutUser}
          onSignIn={signOutUser}
          onDismiss={() => setGuestBannerDismissed(true)}
        />
      )}

      {/* ── Body ─────────────────────────────────────────────── */}
      {currentView === 'home' ? (
        <div className="flex flex-1 overflow-hidden relative">
          <aside className="hidden lg:flex w-72 flex-col bg-parchment-100 dark:bg-dark-surface border-r border-parchment-200 dark:border-dark-border">
            <div className="p-3 border-b border-parchment-200 dark:border-dark-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-dark-muted" />
                <input
                  type="search"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-dark-bg border border-parchment-200 dark:border-dark-border rounded-lg placeholder:text-ink-muted dark:placeholder:text-dark-muted text-ink dark:text-dark-text outline-none focus:border-sage transition-colors"
                  aria-label="Search notes"
                />
              </div>
            </div>

            <NoteList
              notes={filteredNotes}
              allNotes={notes}
              trashedNotes={trashedNotes}
              selectedId={selectedId}
              selectedTag={selectedTag}
              loading={notesLoading}
              onSelect={handleSelectNote}
              onSelectTag={setSelectedTag}
              onNew={handleNewNote}
              onDelete={handleDeleteNote}
              onRestore={undeleteNote}
              onPermanentDelete={permanentDelete}
              onUpdateTags={updateTags}
              trashOpen={trashOpen}
              onOpenTrash={() => setTrashOpen(true)}
              onCloseTrash={() => setTrashOpen(false)}
              onTogglePin={togglePin}
              onToggleFavourite={toggleFavourite}
              unlockedNoteIds={unlockedNoteIds}
            />
          </aside>

          <main className="flex-1 overflow-hidden" role="main">
            <HomePage
              notes={notes}
              user={user}
              onSelectNote={handleSelectNote}
              onNewNote={handleNewNote}
              onBrowseAll={handleBrowseAllNotes}
              onTogglePin={togglePin}
              onToggleFavourite={toggleFavourite}
              unlockedNoteIds={unlockedNoteIds}
            />
          </main>
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Sidebar overlay (mobile) ─────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-ink/20 dark:bg-black/40 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-10
            w-72 flex flex-col bg-parchment-100 dark:bg-dark-surface border-r border-parchment-200 dark:border-dark-border
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:flex
            mt-14 lg:mt-0
          `}
          aria-label="Notes sidebar"
        >
          {/* Search */}
          <div className="p-3 border-b border-parchment-200 dark:border-dark-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-dark-muted" />
              <input
                type="search"
                placeholder="Search notes…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-dark-bg border border-parchment-200 dark:border-dark-border
                           rounded-lg placeholder:text-ink-muted dark:placeholder:text-dark-muted text-ink dark:text-dark-text outline-none
                           focus:border-sage transition-colors"
                aria-label="Search notes"
              />
            </div>
          </div>

          {/* Note list */}
          <NoteList
            notes={filteredNotes}
            allNotes={notes}
            trashedNotes={trashedNotes}
            selectedId={selectedId}
            selectedTag={selectedTag}
            loading={notesLoading}
            onSelect={handleSelectNote}
            onSelectTag={setSelectedTag}
            onNew={handleNewNote}
            onDelete={handleDeleteNote}
            onRestore={undeleteNote}
            onPermanentDelete={permanentDelete}
            onUpdateTags={updateTags}
            trashOpen={trashOpen}
            onOpenTrash={() => setTrashOpen(true)}
            onCloseTrash={() => setTrashOpen(false)}
            onTogglePin={togglePin}
            onToggleFavourite={toggleFavourite}
            unlockedNoteIds={unlockedNoteIds}
          />
        </aside>

        {/* ── Editor ──────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0" role="main">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-2">
              {error}
            </div>
          )}
          {isSelectedLocked && selectedNote ? (
            <LockScreen
              mode="unlock"
              onSuccess={() => handleSessionUnlock(selectedNote?.id)}
              onCancel={() => {
                setShowPinEntry(false)
                setCurrentView('home')
              }}
            />
          ) : (
            <NoteEditor
              note={selectedNote}
              user={user}
              isGuest={isGuest}
              onUpdate={editNote}
              onNew={handleNewNote}
              onToggleShare={toggleShare}
              onAddCollaborator={addCollaborator}
              onRemoveCollaborator={removeCollaborator}
              onToggleLock={handleToggleLock}
              onRelockCurrentNote={() => {
                if (!selectedNote?.id) return
                setUnlockedNoteIds((prev) => prev.filter((id) => id !== selectedNote.id))
              }}
              isUnlocked={Boolean(selectedNote?.id && unlockedNoteIds.includes(selectedNote.id))}
              masterPinSet={masterPinSet}
              lastHistorySavedAt={selectedNote ? lastHistorySavedAtByNote[selectedNote.id] ?? null : null}
            />
          )}
        </main>

        {/* ── AI Panel ────────────────────────────────────── */}
        {!isGuest && aiOpen && (
          <aside
            className="w-80 xl:w-96 border-l border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface flex-shrink-0
                       animate-slide-in-right hidden md:flex flex-col"
            aria-label="AI assistant panel"
          >
            <AIAssistant
              user={user}
              selectedNote={selectedNote}
              onClose={() => setAiOpen(false)}
            />
          </aside>
        )}
      </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {importOpen && (
        <FileImport
          onImport={importFiles}
          onClose={() => setImportOpen(false)}
        />
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 dark:bg-black/50" onClick={() => setHistoryOpen(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[80vh] overflow-hidden rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-panel flex">
            <aside className="w-80 border-r border-parchment-200 dark:border-dark-border overflow-y-auto">
              <div className="px-4 py-3 border-b border-parchment-200 dark:border-dark-border">
                <p className="text-sm font-semibold text-ink dark:text-dark-text">History</p>
              </div>

              <div className="p-2 space-y-1">
                {noteHistory.length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-dark-muted p-3">No history snapshots yet.</p>
                ) : (
                  noteHistory.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedHistoryId(entry.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedHistoryId === entry.id
                          ? 'bg-parchment-200 dark:bg-dark-hover'
                          : 'hover:bg-parchment-100 dark:hover:bg-dark-bg'
                      }`}
                    >
                      <p className="text-sm font-medium text-ink dark:text-dark-text truncate">{entry.title || 'Untitled'}</p>
                      <p className="text-xs text-ink-muted dark:text-dark-muted mt-0.5">
                        {entry.savedAt ? new Date(entry.savedAt).toLocaleString() : 'Unknown time'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-3 border-b border-parchment-200 dark:border-dark-border flex items-center justify-between">
                <p className="text-sm font-semibold text-ink dark:text-dark-text">Version preview</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryOpen(false)}
                    className="px-3 py-1.5 text-xs rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleRestoreHistory}
                    disabled={!activeSnapshot}
                    className="px-3 py-1.5 text-xs rounded-md bg-sage text-white hover:bg-sage-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Restore this version
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeSnapshot ? (
                  <>
                    <h3 className="text-2xl font-serif font-semibold text-ink dark:text-dark-text mb-4">
                      {activeSnapshot.title || 'Untitled'}
                    </h3>
                    <div
                      className="prose-note"
                      dangerouslySetInnerHTML={{ __html: activeSnapshot.content || '<p></p>' }}
                    />
                  </>
                ) : (
                  <p className="text-sm text-ink-muted dark:text-dark-muted">Select a version to preview.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {showPinSetup && (
        <div className="fixed inset-0 z-50 bg-ink/35 dark:bg-black/55">
          <LockScreen
            mode="setup"
            onSuccess={handlePinSetupSuccess}
          />
        </div>
      )}

      <CookieBanner />
    </div>
  )
}
