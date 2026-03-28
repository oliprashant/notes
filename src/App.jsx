// src/App.jsx
// ──────────────────────────────────────────────────────────────
// Root component. Handles auth state, routing between login and
// main app, and layout composition. Now with modern design system!
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, lazy, Suspense, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate, Routes, Route } from 'react-router-dom'
import { useAuth }    from './hooks/useAuth'
import { useNotes }   from './hooks/useNotes'
import { useDarkMode } from './hooks/useDarkMode'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import LoginPage      from './components/Auth/LoginPage'
import NoteList       from './components/Notes/NoteList'
import NoteEditor     from './components/Notes/NoteEditor'
import LockScreen     from './components/Notes/LockScreen'
import HomePage       from './components/Home/HomePage'
import SharedNote     from './components/Notes/SharedNote'
import FileImport     from './components/Import/FileImport'
import GuestBanner    from './components/GuestBanner'
import CookieBanner   from './components/CookieBanner'
import ProfilePage    from './components/Profile/ProfilePage'
import FeedPage       from './components/Social/FeedPage'
import SearchPage     from './components/Social/SearchPage'
import NotificationCenter from './components/Social/NotificationCenter'
import LoadingSpinner from './components/Common/LoadingSpinner'
import {
  PenLine, BotMessageSquare, Upload, LogOut, Lock, Plus, User,
  Menu, X, Search, Sun, Moon, Trash2, Clock, Settings, Bell, Compass
} from 'lucide-react'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const trackAiEvent = (eventName, payload = {}) => {
    console.info('[analytics] ai_event', eventName, payload)
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload)
    }
  }

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
  const [isAiOpen, setIsAiOpen]       = useState(false)
  const [aiLoadError, setAiLoadError] = useState(null)
  // Import modal open state
  const [importOpen, setImportOpen]   = useState(false)
  // Trash panel open state
  const [trashOpen, setTrashOpen]     = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  const LazyAIAssistant = useMemo(
    () => lazy(() =>
      import('./components/AI/AIAssistant').catch((e) => {
        console.error('AI load failed', e)
        setAiLoadError(e)
        trackAiEvent('ai_panel_load_failed', { message: e?.message ?? 'unknown' })
        return { default: () => null }
      })
    ),
    []
  )

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
    if (isGuest && isAiOpen) {
      setIsAiOpen(false)
      trackAiEvent('ai_panel_closed_guest_guard', { reason: 'guest_mode' })
    }
  }, [isGuest, isAiOpen])

  useEffect(() => {
    if (isGuest) {
      setGuestBannerDismissed(false)
    }
  }, [isGuest])

  useEffect(() => {
    if (!showUserMenu) return

    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showUserMenu])

  const pathname = location.pathname
  const isAiRoute = pathname === '/ai'
  const isFeedRoute = pathname === '/feed'
  const isSearchRoute = pathname === '/search'
  const isNotificationsRoute = pathname === '/notifications'
  const profileMatch = pathname.match(/^\/profile(?:\/([^/]+))?$/)
  const isProfileRoute = Boolean(profileMatch)

  // ── Shared note routing ──────────────────────────────────────
  const sharedMatch = pathname.match(/^\/shared\/([^/]+)$/)

  useEffect(() => {
    if (!user || isGuest || !isAiRoute) return
    setIsAiOpen(true)
    trackAiEvent('ai_panel_open_route', { route: '/ai' })
  }, [isAiRoute, user, isGuest])
  
  if (sharedMatch) {
    const noteId = sharedMatch[1]
    return <SharedNote noteId={noteId} />
  }

  if (isProfileRoute) {
    return <ProfilePage viewedUserId={profileMatch?.[1] ?? null} />
  }

  if (isFeedRoute) {
    return <FeedPage />
  }

  if (isSearchRoute) {
    return <SearchPage />
  }

  if (isNotificationsRoute) {
    return <NotificationCenter />
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
        {isAiRoute && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Please sign in to access the AI assistant.
          </div>
        )}
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
  const canUseAI = !isGuest
  const aiDisabledReason = canUseAI ? '' : 'AI assistant is disabled in guest mode. Sign in to enable it.'

  const handleOpenAiPanel = () => {
    if (!canUseAI) {
      console.warn('AI button click blocked', { reason: aiDisabledReason })
      trackAiEvent('ai_button_blocked', { reason: 'guest_mode' })
      return
    }

    setAiLoadError(null)
    setIsAiOpen(true)
    trackAiEvent('ai_button_clicked', { opened: true })
  }

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
      <header className="h-[52px] border-b border-parchment-200/90 dark:border-dark-border/90 bg-white/80 dark:bg-black/80 backdrop-blur-xl flex items-center px-4 gap-3 flex-shrink-0 z-20">
        {currentView === 'editor' && (
          <button
            className="lg:hidden p-1.5 rounded-xl text-ink-muted dark:text-dark-secondary hover:bg-parchment-100 dark:hover:bg-dark-elevated transition-all duration-150"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        <Link to="/" className="flex items-center gap-2 mr-auto" aria-label="Go to home">
          <span className="w-2.5 h-2.5 rounded-full bg-sage dark:bg-sage-dark inline-flex" />
          <span className="font-heading font-semibold text-[1.05rem] text-ink dark:text-dark-text tracking-tight">NoteFlow</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/search')}
            className="w-8 h-8 rounded-xl text-ink-muted dark:text-dark-secondary hover:bg-parchment-100 dark:hover:bg-dark-elevated hover:text-ink dark:hover:text-dark-text transition-all duration-150"
            title="Search"
            aria-label="Search"
          >
            <Search size={16} className="mx-auto" />
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="w-8 h-8 rounded-xl text-ink-muted dark:text-dark-secondary hover:bg-parchment-100 dark:hover:bg-dark-elevated hover:text-ink dark:hover:text-dark-text transition-all duration-150"
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell size={16} className="mx-auto" />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-8 h-8 rounded-full ring-1 ring-parchment-200 dark:ring-dark-border hover:scale-[1.02] transition-transform"
              aria-label="Open user menu"
              aria-expanded={showUserMenu}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName ?? 'User avatar'} className="w-8 h-8 rounded-full" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-parchment-100 dark:bg-dark-elevated inline-flex items-center justify-center">
                  <User size={14} className="text-ink-muted dark:text-dark-secondary" />
                </span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-parchment-200 dark:border-dark-border bg-white/90 dark:bg-dark-surface/95 backdrop-blur-xl shadow-lg p-2 animate-scale-in z-40">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium text-ink dark:text-dark-text truncate">{user.displayName || 'Guest user'}</p>
                  <p className="text-xs text-ink-muted dark:text-dark-secondary truncate">{user.email || 'guest@noteflow.local'}</p>
                </div>

                <div className="h-px bg-parchment-200 dark:bg-dark-border my-1" />

                <button
                  onClick={() => {
                    toggleDarkMode()
                    setShowUserMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated transition-colors"
                >
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>

                <div className="h-px bg-parchment-200 dark:bg-dark-border my-1" />

                <button onClick={() => { navigate('/feed'); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">Feed</button>
                <button onClick={() => { navigate('/profile'); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">Profile</button>
                <button onClick={() => { handleOpenAiPanel(); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">AI assistant</button>
                <button onClick={() => { setIsSettingsOpen(true); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">Settings</button>
                <button onClick={() => { setImportOpen(true); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">Import files</button>
                {!isGuest && (
                  <button onClick={() => { handleOpenHistory(); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">History</button>
                )}
                <button onClick={() => { setTrashOpen(true); setShowUserMenu(false) }} className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated">Trash</button>

                {hasLockedNotes && (
                  <button
                    onClick={() => {
                      setUnlockedNoteIds([])
                      if (selectedNote?.locked) setShowPinEntry(true)
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated"
                  >
                    Lock session
                  </button>
                )}

                <div className="h-px bg-parchment-200 dark:bg-dark-border my-1" />

                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    signOutUser()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-elevated transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
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
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex flex-1 overflow-hidden relative animate-fade-up">
              <aside className="hidden lg:flex w-[260px] flex-col bg-parchment-100/80 dark:bg-dark-surface/80 backdrop-blur-sm">
                <div className="p-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-dark-muted" />
                    <input
                      type="search"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 text-sm bg-white/90 dark:bg-dark-elevated/80 rounded-xl placeholder:text-ink-muted dark:placeholder:text-dark-secondary text-ink dark:text-dark-text outline-none focus:ring-2 focus:ring-sage/30 dark:focus:ring-sage-dark/30 transition-all"
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

            <div className="mx-3 mb-3 mt-auto rounded-xl bg-white/70 dark:bg-dark-elevated/80 px-3 py-2.5 flex items-center gap-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName ?? 'User avatar'} className="w-7 h-7 rounded-full" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-parchment-200 dark:bg-dark-border inline-flex items-center justify-center">
                  <User size={13} className="text-ink-muted dark:text-dark-secondary" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink dark:text-dark-text truncate">{user.displayName || 'Guest user'}</p>
                <p className="text-[11px] text-ink-muted dark:text-dark-secondary truncate">{user.email || 'guest@noteflow.local'}</p>
              </div>
            </div>
          </aside>

          <main className="flex-1 overflow-hidden bg-parchment-50 dark:bg-dark-bg" role="main">
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
            }
        />

        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/shared/:noteId" element={<SharedNote />} />
      </Routes>

      {/* ── AI Panel (App-level) ───────────────────────────── */}
      {isAiOpen && (
        <>
          {/* Mobile backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/30 dark:bg-black/50 md:hidden"
            onClick={() => {
              setIsAiOpen(false)
              trackAiEvent('ai_panel_closed_backdrop', { source: 'backdrop' })
            }}
            aria-label="Close AI assistant panel"
          />

          <aside
            className="fixed inset-y-0 right-0 z-50 w-[92vw] max-w-md bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-l border-parchment-200 dark:border-dark-border flex flex-col animate-slide-in-right md:w-80 xl:w-96"
            aria-label="AI assistant panel"
          >
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-sm text-ink-muted dark:text-dark-muted px-6 text-center">
                  Loading AI assistant...
                </div>
              }
            >
              <LazyAIAssistant
                open={isAiOpen}
                user={user}
                selectedNote={selectedNote}
                onClose={() => {
                  setIsAiOpen(false)
                  trackAiEvent('ai_panel_closed_button', { source: 'panel_close' })
                }}
              />
            </Suspense>
          </aside>
        </>
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => setHistoryOpen(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[80vh] overflow-hidden rounded-2xl border border-parchment-200/80 dark:border-dark-border bg-white/95 dark:bg-dark-surface/95 shadow-lg flex animate-scale-in">
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

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <CookieBanner />
    </div>
  )
}

function SettingsModal({ open, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 dark:bg-black/50"
        onClick={onClose}
        aria-label="Close settings"
      />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-parchment-200/80 dark:border-dark-border bg-white/95 dark:bg-dark-surface/95 shadow-lg p-5 animate-scale-in">
        <h2 className="text-sm font-semibold text-ink dark:text-dark-text">Settings</h2>
        <p className="text-sm text-ink-muted dark:text-dark-muted mt-2">Settings coming soon</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium rounded-md bg-sage text-white hover:bg-sage-light transition-colors"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  )
}
