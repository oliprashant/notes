import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

/**
 * NoteContext - Manages application-wide notes state
 * Provides CRUD operations and filtering
 */
const NoteContext = createContext()

const initialState = {
  notes: [],
  selectedNoteId: null,
  filter: 'all', // 'all', 'starred', 'archived'
  searchQuery: '',
  loading: false,
  error: null,
}

function noteReducer(state, action) {
  switch (action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.payload, loading: false }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'ADD_NOTE':
      return {
        ...state,
        notes: [action.payload, ...state.notes],
        selectedNoteId: action.payload.id,
      }

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.payload.id ? action.payload : note
        ),
      }

    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter((note) => note.id !== action.payload),
        selectedNoteId:
          state.selectedNoteId === action.payload ? null : state.selectedNoteId,
      }

    case 'SET_SELECTED_NOTE':
      return { ...state, selectedNoteId: action.payload }

    case 'SET_FILTER':
      return { ...state, filter: action.payload }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }

    case 'TOGGLE_STARRED':
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.payload
            ? { ...note, starred: !note.starred }
            : note
        ),
      }

    default:
      return state
  }
}

export function NoteProvider({ children }) {
  const [state, dispatch] = useReducer(noteReducer, initialState)

  // Load notes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('noteflow-notes')
    if (stored) {
      try {
        const notes = JSON.parse(stored)
        dispatch({ type: 'SET_NOTES', payload: notes })
      } catch (err) {
        console.error('Error loading notes:', err)
      }
    }
  }, [])

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('noteflow-notes', JSON.stringify(state.notes))
  }, [state.notes])

  const addNote = useCallback((note) => {
    const newNote = {
      id: Date.now().toString(),
      title: note.title || 'Untitled',
      content: note.content || '',
      tags: note.tags || [],
      starred: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_NOTE', payload: newNote })
    return newNote
  }, [])

  const updateNote = useCallback((id, updates) => {
    const updatedNote = {
      ...state.notes.find((n) => n.id === id),
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_NOTE', payload: updatedNote })
    return updatedNote
  }, [state.notes])

  const deleteNote = useCallback((id) => {
    dispatch({ type: 'DELETE_NOTE', payload: id })
  }, [])

  const selectNote = useCallback((id) => {
    dispatch({ type: 'SET_SELECTED_NOTE', payload: id })
  }, [])

  const setFilter = useCallback((filter) => {
    dispatch({ type: 'SET_FILTER', payload: filter })
  }, [])

  const setSearchQuery = useCallback((query) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }, [])

  const toggleStarred = useCallback((id) => {
    dispatch({ type: 'TOGGLE_STARRED', payload: id })
  }, [])

  const getFilteredNotes = useCallback(() => {
    let filtered = state.notes

    // Apply filter
    if (state.filter === 'starred') {
      filtered = filtered.filter((note) => note.starred)
    } else if (state.filter === 'archived') {
      filtered = filtered.filter((note) => note.archived)
    }

    // Apply search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [state.notes, state.filter, state.searchQuery])

  const value = {
    // State
    notes: state.notes,
    selectedNoteId: state.selectedNoteId,
    filter: state.filter,
    searchQuery: state.searchQuery,
    loading: state.loading,
    error: state.error,
    filteredNotes: getFilteredNotes(),
    selectedNote: state.notes.find((n) => n.id === state.selectedNoteId),

    // Actions
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    setFilter,
    setSearchQuery,
    toggleStarred,
  }

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  )
}

export function useNotes() {
  const context = useContext(NoteContext)
  if (!context) {
    throw new Error('useNotes must be used within NoteProvider')
  }
  return context
}
