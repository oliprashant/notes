import { useState } from 'react'
import Sidebar from './Sidebar'
import UserProfile from './UserProfile'

/**
 * MainLayout Component - Wraps the main application layout
 * Handles sidebar toggling on mobile
 */
export default function MainLayout({
  user,
  onLogout,
  onCreateNote,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white dark:bg-dark-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onCreateNote={onCreateNote}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden lg:mr-24">
        {children}
      </main>

      {/* User Profile Panel */}
      <UserProfile user={user} onLogout={onLogout} />
    </div>
  )
}
