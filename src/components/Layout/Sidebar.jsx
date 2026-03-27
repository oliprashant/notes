import { useState } from 'react'
import { Menu, X, Plus } from 'lucide-react'
import { useNotes } from '../../context/NoteContext'
import SearchBar from '../Common/SearchBar'
import FilterTabs from '../Common/FilterTabs'
import NoteCard from '../Notes/NoteCard'
import Button from '../UI/Button'

/**
 * Sidebar Component - Left sidebar with notes list
 * Collapsible on mobile, shows search, filters, and note list
 */
export default function Sidebar({
  onCreateNote,
  isOpen = true,
  onToggle,
}) {
  const {
    notes,
    filteredNotes,
    selectedNoteId,
    selectNote,
    toggleStarred,
    deleteNote,
    filter,
    setFilter,
    setSearchQuery,
  } = useNotes()

  const filterTabs = [
    { id: 'all', label: 'All', count: notes.length },
    { id: 'starred', label: 'Starred', count: notes.filter(n => n.starred).length },
    { id: 'archived', label: 'Archived', count: notes.filter(n => n.archived).length },
  ]

  return (
    <>
      {/* Mobile menu toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg lg:hidden bg-blue-500 text-white hover:bg-blue-600"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-0 lg:inset-auto w-80 h-screen lg:h-auto bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } z-30`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            Noteflow
          </h1>
          <Button
            variant="primary"
            size="md"
            onClick={onCreateNote}
            icon={Plus}
            className="w-full"
          >
            New Note
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border">
          <SearchBar
            placeholder="Search notes..."
            onSearch={setSearchQuery}
            debounceDelay={300}
          />
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border">
          <FilterTabs
            tabs={filterTabs}
            activeTab={filter}
            onTabChange={setFilter}
          />
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  onSelect={selectNote}
                  onToggleStar={toggleStarred}
                  onDelete={deleteNote}
                />
              ))}
            </div>
          )}
        </div>

        {/* User Stats Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-dark-muted">
          <div className="flex justify-between">
            <span>{notes.length} notes</span>
            <span>
              {notes.reduce((sum, note) => sum + (note.content?.split(/\s+/).length || 0), 0)} words
            </span>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-20"
          onClick={onToggle}
        />
      )}
    </>
  )
}
