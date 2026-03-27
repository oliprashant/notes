/**
 * AppModern.jsx - Modern note-taking app using new design system
 * This is a reference implementation showing how to use all the new components
 */
import { useAuth } from './hooks/useAuth'
import { NoteProvider, useNotes } from './context/NoteContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import LoginPage from './components/Auth/LoginPage'
import MainLayout from './components/Layout/MainLayout'
import NoteEditor from './components/Notes/NoteEditor'

function AppContent() {
  const { user, signOutUser } = useAuth()
  const { addNote } = useNotes()
  const { mounted } = useTheme()

  if (!mounted) return null

  if (!user) {
    return <LoginPage />
  }

  return (
    <MainLayout
      user={user}
      onLogout={signOutUser}
      onCreateNote={() => addNote({ title: 'New Note', content: '' })}
    >
      <NoteEditor onCreateNote={() => addNote({ title: 'New Note', content: '' })} />
    </MainLayout>
  )
}

export default function AppModern() {
  return (
    <ThemeProvider>
      <NoteProvider>
        <AppContent />
      </NoteProvider>
    </ThemeProvider>
  )
}
