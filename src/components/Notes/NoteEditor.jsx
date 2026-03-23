// src/components/Notes/NoteEditor.jsx
// ──────────────────────────────────────────────────────────────
// Main editing area powered by TipTap rich text editor.
// Auto-saves title + content with a short debounce.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Color from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Brain,
  CheckSquare,
  Download,
  Heading1,
  Heading2,
  Highlighter,
  ImageIcon,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Palette,
  PenLine,
  Plus,
  Quote,
  Share2,
  Sparkles,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Users,
  X,
} from 'lucide-react'

const SAVE_DEBOUNCE_MS = 800
const NOTE_LABEL_COLORS = [
  { value: null, label: 'None', swatch: '#E5E5E0' },
  { value: '#E57373', label: 'Red', swatch: '#E57373' },
  { value: '#FFB74D', label: 'Orange', swatch: '#FFB74D' },
  { value: '#FFF176', label: 'Yellow', swatch: '#FFF176' },
  { value: '#81C784', label: 'Green', swatch: '#81C784' },
  { value: '#64B5F6', label: 'Blue', swatch: '#64B5F6' },
  { value: '#CE93D8', label: 'Purple', swatch: '#CE93D8' },
]
const TEXT_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#FFFFFF',
  '#1A1A18',
]
const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '15px' },
  { label: 'Large', value: '20px' },
  { label: 'Huge', value: '28px' },
]

const TEMPLATES = [
  {
    id: 'daily-journal',
    title: 'Daily Journal',
    description: 'Reflect on your day with structured prompts',
    icon: PenLine,
    content: '<h2>Date: </h2><p>How am I feeling today?</p><p></p><h2>What happened today?</h2><p></p><h2>What am I grateful for?</h2><ul><li></li><li></li><li></li></ul><h2>Tomorrow\'s goals</h2><ul><li></li><li></li></ul>',
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Document meeting details and action items',
    icon: MessageSquare,
    content: '<h2>Meeting: </h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><p></p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion</h2><p></p><h2>Action Items</h2><ul><li></li></ul><h2>Next Meeting</h2><p></p>',
  },
  {
    id: 'todo-list',
    title: 'Todo List',
    description: 'Organize tasks by status',
    icon: CheckSquare,
    content: '<h2>Today\'s Tasks</h2><ul><li></li><li></li><li></li></ul><h2>In Progress</h2><ul><li></li></ul><h2>Completed</h2><ul><li></li></ul>',
  },
  {
    id: 'book-notes',
    title: 'Book Notes',
    description: 'Record book details and key insights',
    icon: BookOpen,
    content: '<h2>Book: </h2><p><strong>Author:</strong> </p><p><strong>Genre:</strong> </p><p></p><h2>Summary</h2><p></p><h2>Key Ideas</h2><ul><li></li></ul><h2>Favourite Quotes</h2><blockquote><p></p></blockquote><h2>My Thoughts</h2><p></p>',
  },
  {
    id: 'lecture-notes',
    title: 'Lecture Notes',
    description: 'Capture lecture content and key topics',
    icon: Heading2,
    content: '<h2>Subject: </h2><p><strong>Date:</strong> </p><p><strong>Topic:</strong> </p><p></p><h2>Key Points</h2><ul><li></li></ul><h2>Important Terms</h2><ul><li></li></ul><h2>Questions</h2><ul><li></li></ul><h2>Summary</h2><p></p>',
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm',
    description: 'Develop and explore new ideas',
    icon: Brain,
    content: '<h2>Idea: </h2><p></p><h2>Why it matters</h2><p></p><h2>How it could work</h2><ul><li></li></ul><h2>Challenges</h2><ul><li></li></ul><h2>Next steps</h2><ul><li></li></ul>',
  },
]

function getWordCountFromText(text = '') {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function stripHtmlToText(html = '') {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function htmlToMarkdown(html = '') {
  const root = document.createElement('div')
  root.innerHTML = html

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const tag = node.tagName.toLowerCase()
    const children = Array.from(node.childNodes).map(walk).join('')

    if (tag === 'strong' || tag === 'b') return `**${children}**`
    if (tag === 'em' || tag === 'i') return `*${children}*`
    if (tag === 'u') return `<u>${children}</u>`
    if (tag === 's' || tag === 'strike') return `~~${children}~~`
    if (tag === 'h1') return `# ${children}\n\n`
    if (tag === 'h2') return `## ${children}\n\n`
    if (tag === 'blockquote') return `> ${children}\n\n`
    if (tag === 'li') return `- ${children}\n`
    if (tag === 'ul' || tag === 'ol') return `${children}\n`
    if (tag === 'br') return '\n'
    if (tag === 'p') return `${children}\n\n`
    return children
  }

  return Array.from(root.childNodes).map(walk).join('').trim()
}

function formatHistorySavedAt(date) {
  if (!date) return 'No snapshots yet'
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function NoteEditor({
  note,
  user,
  isGuest = false,
  onUpdate,
  onNew,
  onToggleShare,
  onAddCollaborator,
  onRemoveCollaborator,
  onToggleLock,
  onRelockCurrentNote,
  isUnlocked = false,
  masterPinSet = false,
  lastHistorySavedAt = null,
}) {
  const [title,   setTitle]   = useState('')
  const [saved,   setSaved]   = useState(true)
  const [showColors, setShowColors] = useState(false)
  const [showTextColors, setShowTextColors] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [showShareLink, setShowShareLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [collaboratorEmail, setCollaboratorEmail] = useState('')
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showLockMenu, setShowLockMenu] = useState(false)
  const [lockNotice, setLockNotice] = useState('')

  const titleSaveTimerRef = useRef(null)
  const contentSaveTimerRef = useRef(null)
  const noteIdRef    = useRef(null)
  const colorRef = useRef(null)
  const textColorRef = useRef(null)
  const tagInputWrapRef = useRef(null)
  const tagInputRef = useRef(null)
  const templateRef = useRef(null)
  const fontSizeRef = useRef(null)
  const collaboratorsRef = useRef(null)
  const lockRef = useRef(null)
  const imageInputRef = useRef(null)
  const recognitionRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Image.configure({ inline: true, allowBase64: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor: tiptap }) => {
      if (!note) return

      const html = tiptap.getHTML()
      setWordCount(getWordCountFromText(tiptap.getText()))
      setSaved(false)
      clearTimeout(contentSaveTimerRef.current)
      contentSaveTimerRef.current = setTimeout(() => {
        onUpdate(note.id, { content: html })
        setSaved(true)
      }, SAVE_DEBOUNCE_MS)
    },
  })

  // Sync editor state when a different note is selected
  useEffect(() => {
    if (!editor) return

    if (note?.id !== noteIdRef.current) {
      noteIdRef.current = note?.id ?? null
      const nextTitle = note?.title ?? ''
      const nextContent = note?.content?.trim() ? note.content : '<p></p>'

      setTitle(nextTitle)
      editor.commands.setContent(nextContent, { emitUpdate: false })
      setWordCount(getWordCountFromText(editor.getText()))
      setShowColors(false)
      setShowTextColors(false)
      setShowTagInput(false)
      setTagInput('')
      setSaved(true)
      setShowCollaborators(false)
      setCollaboratorEmail('')
      setIsBottomSheetOpen(false)
      setShowLockMenu(false)
      setLockNotice('')

      clearTimeout(titleSaveTimerRef.current)
      clearTimeout(contentSaveTimerRef.current)
    }
  }, [note, editor])

  useEffect(() => {
    return () => {
      clearTimeout(titleSaveTimerRef.current)
      clearTimeout(contentSaveTimerRef.current)
    }
  }, [])

  // Close popovers when clicking outside them
  useEffect(() => {
    if (!showColors && !showTextColors) return

    const handleMouseDown = (event) => {
      if (showColors && colorRef.current && !colorRef.current.contains(event.target)) {
        setShowColors(false)
      }
      if (showTextColors && textColorRef.current && !textColorRef.current.contains(event.target)) {
        setShowTextColors(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showColors, showTextColors])

  useEffect(() => {
    if (!showTagInput) return

    const handleMouseDown = (event) => {
      if (!tagInputWrapRef.current) return
      if (!tagInputWrapRef.current.contains(event.target)) {
        setShowTagInput(false)
        setTagInput('')
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showTagInput])

  useEffect(() => {
    if (showTagInput) {
      requestAnimationFrame(() => tagInputRef.current?.focus())
    }
  }, [showTagInput])

  useEffect(() => {
    if (!showTemplates) return

    const handleMouseDown = (event) => {
      if (!templateRef.current) return
      if (!templateRef.current.contains(event.target)) {
        setShowTemplates(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showTemplates])

  useEffect(() => {
    if (!showFontSize) return

    const handleMouseDown = (event) => {
      if (!fontSizeRef.current) return
      if (!fontSizeRef.current.contains(event.target)) {
        setShowFontSize(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showFontSize])

  useEffect(() => {
    if (!showCollaborators) return

    const handleMouseDown = (event) => {
      if (!collaboratorsRef.current) return
      if (!collaboratorsRef.current.contains(event.target)) {
        setShowCollaborators(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showCollaborators])

  useEffect(() => {
    if (!showLockMenu) return

    const handleMouseDown = (event) => {
      if (!lockRef.current) return
      if (!lockRef.current.contains(event.target)) {
        setShowLockMenu(false)
        setLockNotice('')
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showLockMenu])

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const scheduleTitleSave = useCallback((newTitle) => {
    if (!note) return
    setSaved(false)
    clearTimeout(titleSaveTimerRef.current)
    titleSaveTimerRef.current = setTimeout(() => {
      onUpdate(note.id, { title: newTitle })
      setSaved(true)
    }, SAVE_DEBOUNCE_MS)
  }, [note, onUpdate])

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    scheduleTitleSave(val)
  }

  const handleColorSelect = (color) => {
    if (!note) return
    onUpdate(note.id, { color })
    setShowColors(false)
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setShowTagInput(false)
      setTagInput('')
      return
    }

    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!note) return

    const nextTag = tagInput.trim()
    if (!nextTag) return

    const existing = Array.isArray(note.tags) ? note.tags : []
    if (existing.some(tag => tag.toLowerCase() === nextTag.toLowerCase())) {
      setShowTagInput(false)
      setTagInput('')
      return
    }

    const updatedTags = [...existing, nextTag]
    onUpdate(note.id, { tags: updatedTags })
    setShowTagInput(false)
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove) => {
    if (!note) return
    const existing = Array.isArray(note.tags) ? note.tags : []
    const updatedTags = existing.filter(tag => tag !== tagToRemove)
    onUpdate(note.id, { tags: updatedTags })
  }

  const handleToggleShare = async () => {
    if (!note || !onToggleShare) return
    await onToggleShare(note.id, note.shared ?? false)
  }

  const handleCopyShareLink = () => {
    if (!note) return
    const shareUrl = `https://noteflow-4a39e.web.app/shared/${note.id}`
    navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleApplyTemplate = (template) => {
    if (!note || !editor) return
    
    const newTitle = template.title
    setTitle(newTitle)
    editor.commands.setContent(template.content, { emitUpdate: false })
    setWordCount(getWordCountFromText(editor.getText()))
    
    // Save to Firestore
    onUpdate(note.id, {
      title: newTitle,
      content: template.content,
    })
    
    setShowTemplates(false)
  }

  const handleSetFontSize = (fontSize) => {
    if (!editor) return
    editor.chain().focus().setMark('textStyle', { fontSize }).run()
    setShowFontSize(false)
  }

  const getCurrentFontSize = () => {
    if (!editor) return '15px'
    return editor.getAttributes('textStyle')?.fontSize ?? '15px'
  }

  const handleSummarize = async () => {
    if (!editor || !note) return
    
    // Don't save summary for locked notes
    if (note.locked) {
      alert('Cannot generate summary for locked notes.')
      return
    }
    
    const content = editor.getText().trim()
    if (!content) {
      alert('Cannot summarize empty note.')
      return
    }

    setSummaryLoading(true)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a summarization assistant. Summarize the given note in 3-5 clear sentences covering the main points and key ideas. Be concise but comprehensive. Return only the summary, nothing else.' },
            { role: 'user', content: editor.getText() }
          ],
          max_tokens: 200
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to generate summary')
      }

      const data = await res.json()
      const summaryText = data.choices?.[0]?.message?.content?.trim()

      if (summaryText) {
        onUpdate(note.id, { summary: summaryText })
      } else {
        alert('Could not generate summary. Please try again.')
      }
    } catch (error) {
      console.error('Summarization error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleMicClick = () => {
    if (!editor) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Not supported in this browser. Use Chrome.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      // Only process the latest result, not all previous ones
      const lastResult = event.results[event.results.length - 1]

      // Only insert if this result is final (not interim)
      if (lastResult.isFinal) {
        editor.chain().focus().insertContent(lastResult[0].transcript + ' ').run()
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      const errorMsg = event.error === 'no-speech' 
        ? 'No speech detected. Please try again.'
        : `Error: ${event.error}`
      alert(errorMsg)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
    setIsRecording(true)
  }

  const handleImageButtonClick = () => {
    imageInputRef.current?.click()
  }

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      event.target.value = ''
      return
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_SIZE_BYTES) {
      alert('Image size must be 5MB or less.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      editor.chain().focus().setImage({ src: e.target.result }).run()
      event.target.value = ''
    }
    reader.onerror = () => {
      alert('Failed to read image file. Please try again.')
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleAddCollaborator = async () => {
    if (!note || !onAddCollaborator) return

    const email = collaboratorEmail.trim().toLowerCase()
    if (!email) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.')
      return
    }

    const existing = Array.isArray(note.collaborators)
      ? note.collaborators.map((entry) => String(entry).toLowerCase())
      : []

    if (existing.includes(email)) {
      setCollaboratorEmail('')
      return
    }

    await onAddCollaborator(note.id, email)
    setCollaboratorEmail('')
  }

  const handleRemoveCollaborator = async (email) => {
    if (!note || !onRemoveCollaborator) return
    await onRemoveCollaborator(note.id, email)
  }

  const handleToggleLockMenu = () => {
    setShowLockMenu((prev) => !prev)
    setLockNotice('')
  }

  const handleLockToggle = async () => {
    if (!note || !onToggleLock) return

    if (!note.locked && !masterPinSet) {
      setLockNotice('Set a master PIN first')
    }

    await onToggleLock(note.id, Boolean(note.locked))
    if (note.locked || masterPinSet) {
      setShowLockMenu(false)
      setLockNotice('')
    }
  }


  const exportNote = (format) => {
    if (!editor) return

    const html = editor.getHTML()

    if (format === 'pdf') {
      const printStyle = document.createElement('style')
      printStyle.setAttribute('data-print-note-style', 'true')
      printStyle.textContent = `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-note-root,
          #print-note-root * {
            visibility: visible !important;
          }
          #print-note-root {
            position: fixed;
            inset: 0;
            padding: 32px;
            background: #ffffff;
            color: #111111;
            font-family: 'DM Sans', sans-serif;
          }
          #print-note-root h1 {
            font-size: 28px;
            margin: 0 0 16px;
            font-family: 'Lora', serif;
          }
          #print-note-root .print-content {
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
        }
      `

      const printRoot = document.createElement('div')
      printRoot.id = 'print-note-root'
      const heading = document.createElement('h1')
      heading.textContent = title || 'Untitled'
      const body = document.createElement('div')
      body.className = 'print-content'
      body.innerHTML = html
      printRoot.appendChild(heading)
      printRoot.appendChild(body)

      const cleanup = () => {
        printStyle.remove()
        printRoot.remove()
      }

      document.head.appendChild(printStyle)
      document.body.appendChild(printRoot)
      window.addEventListener('afterprint', cleanup, { once: true })
      window.print()
      setTimeout(cleanup, 1200)
      return
    }

    const payload = format === 'md'
      ? htmlToMarkdown(html)
      : stripHtmlToText(html)

    const blob = new Blob([payload], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'untitled'}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toolbarBtn = (active = false) => {
    const base = 'px-2 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center justify-center gap-1'
    const activeCls = 'bg-parchment-200 dark:bg-dark-hover text-ink dark:text-dark-text'
    const idleCls = 'text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover'
    return `${base} ${active ? activeCls : idleCls}`
  }

  const keepEditorFocus = (e) => e.preventDefault()

  const activeTextColor = editor?.getAttributes('textStyle')?.color ?? null
  const isOwner = Boolean(user && note && user.uid === note.uid)
  const collaborators = Array.isArray(note?.collaborators) ? note.collaborators : []

  const mobileSheetBtn = (label, icon, onClick, active = false, disabled = false, title = label) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      style={{ touchAction: 'manipulation' }}
      className={`w-12 h-12 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1
        ${active
          ? 'bg-sage/15 border-sage text-sage dark:bg-sage/20 dark:text-sage-light'
          : 'bg-parchment-100 border-parchment-200 text-ink-muted dark:bg-dark-bg dark:border-dark-border dark:text-dark-muted'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-sage hover:text-sage'}
      `}
    >
      {icon}
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  )

  // ── Empty state ─────────────────────────────────────────────
  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 bg-parchment-50 dark:bg-dark-bg">
        <div className="w-14 h-14 rounded-2xl bg-parchment-200 dark:bg-dark-hover flex items-center justify-center">
          <PenLine size={24} className="text-ink-muted dark:text-dark-muted" />
        </div>
        <div>
          <p className="text-ink dark:text-dark-text font-medium mb-1">No note selected</p>
          <p className="text-sm text-ink-muted dark:text-dark-muted">
            Choose a note from the sidebar or create a new one.
          </p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-lg
                     hover:bg-sage-light transition-colors"
        >
          Create new note
        </button>
      </div>
    )
  }

  // ── Editor ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-fade-in bg-parchment-50 dark:bg-dark-bg">
      <div className="md:hidden px-4 py-2 border-b border-parchment-200 dark:border-dark-border bg-parchment-100/80 dark:bg-dark-surface/80 backdrop-blur-sm flex items-center justify-between">
        <span className="text-[11px] text-ink-muted dark:text-dark-muted">{wordCount} words</span>
        <span
          className={`text-[11px] transition-opacity duration-300 ${saved ? 'text-sage' : 'text-ink-muted dark:text-dark-muted'}`}
          aria-live="polite"
        >
          {saved ? '✓ Saved' : 'Saving...'}
        </span>
      </div>

      {/* Desktop toolbar */}
      <div className="hidden md:block flex-shrink-0">
        <div className="px-6 py-3 border-b border-parchment-200 dark:border-dark-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleBold().run()} className={toolbarBtn(editor?.isActive('bold'))} aria-label="Bold" title="Bold"><Bold size={13} /></button>
            <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleItalic().run()} className={toolbarBtn(editor?.isActive('italic'))} aria-label="Italic" title="Italic"><Italic size={13} /></button>
            <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleUnderline().run()} className={toolbarBtn(editor?.isActive('underline'))} aria-label="Underline" title="Underline"><UnderlineIcon size={13} /></button>
            <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleStrike().run()} className={toolbarBtn(editor?.isActive('strike'))} aria-label="Strikethrough" title="Strikethrough"><Strikethrough size={13} /></button>
            <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleHighlight().run()} className={toolbarBtn(editor?.isActive('highlight'))} aria-label="Highlight" title="Highlight"><Highlighter size={13} /></button>

            <div className="relative" ref={textColorRef}>
              <button onMouseDown={keepEditorFocus} onClick={() => setShowTextColors((v) => !v)} className={toolbarBtn(showTextColors)} aria-label="Text color" aria-pressed={showTextColors} title="Text color"><Palette size={13} /></button>
              {showTextColors && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-panel p-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        onMouseDown={keepEditorFocus}
                        onClick={() => {
                          editor?.chain().focus().setColor(color).run()
                          setShowTextColors(false)
                        }}
                        className={`w-6 h-6 rounded-full border hover:border-sage transition-colors ${activeTextColor === color ? 'ring-1 ring-sage border-sage' : 'border-parchment-200 dark:border-dark-border'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Set text color ${color}`}
                        title={color}
                      />
                    ))}
                  </div>
                  <button onMouseDown={keepEditorFocus} onClick={() => { editor?.chain().focus().unsetColor().run(); setShowTextColors(false) }} className="mt-2 w-full px-2 py-1.5 text-xs rounded-md text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors" title="Remove text color">Remove color</button>
                </div>
              )}
            </div>

            <div className="relative" ref={fontSizeRef}>
              <button onMouseDown={keepEditorFocus} onClick={() => setShowFontSize((v) => !v)} className={toolbarBtn(showFontSize)} aria-label="Font size" aria-pressed={showFontSize} title="Font size"><Type size={13} /></button>
              {showFontSize && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-panel p-1">
                  {FONT_SIZES.map(({ label, value }) => {
                    const isSelected = getCurrentFontSize() === value
                    return (
                      <button key={value} onMouseDown={keepEditorFocus} onClick={() => handleSetFontSize(value)} className={`w-full px-3 py-1.5 text-xs rounded-md text-left transition-colors ${isSelected ? 'bg-parchment-200 dark:bg-dark-hover text-ink dark:text-dark-text font-medium' : 'text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover'}`} title={label}>{label}</button>
                    )
                  })}
                </div>
              )}
            </div>

            {!isGuest && (
              <button onMouseDown={(e) => e.preventDefault()} onClick={handleMicClick} className={`px-2 py-1.5 rounded-md transition-colors ${isRecording ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : 'text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover'}`} title={isRecording ? 'Stop recording' : 'Start voice input'} aria-label={isRecording ? 'Stop recording' : 'Start voice input'}>{isRecording ? <MicOff size={13} /> : <Mic size={13} />}</button>
            )}
          </div>
        </div>

        <div className="h-px bg-parchment-200 dark:bg-dark-border" />

        <div className="px-6 py-3 border-b border-parchment-200 dark:border-dark-border">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={toolbarBtn(editor?.isActive({ textAlign: 'left' }))} aria-label="Align left" title="Align left"><AlignLeft size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={toolbarBtn(editor?.isActive({ textAlign: 'center' }))} aria-label="Align center" title="Align center"><AlignCenter size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={toolbarBtn(editor?.isActive({ textAlign: 'right' }))} aria-label="Align right" title="Align right"><AlignRight size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={toolbarBtn(editor?.isActive('heading', { level: 1 }))} aria-label="Heading 1" title="Heading 1"><Heading1 size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={toolbarBtn(editor?.isActive('heading', { level: 2 }))} aria-label="Heading 2" title="Heading 2"><Heading2 size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleBulletList().run()} className={toolbarBtn(editor?.isActive('bulletList'))} aria-label="Bullet list" title="Bullet list"><List size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={toolbarBtn(editor?.isActive('orderedList'))} aria-label="Ordered list" title="Ordered list"><ListOrdered size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={toolbarBtn(editor?.isActive('blockquote'))} aria-label="Blockquote" title="Blockquote"><Quote size={13} /></button>

              <div className="relative" ref={colorRef}>
                <button onMouseDown={keepEditorFocus} onClick={() => setShowColors((v) => !v)} className={toolbarBtn(showColors)} aria-label="Choose note label color" aria-pressed={showColors} title="Note label color">
                  <Palette size={13} />
                  {note.color && <span className="w-2.5 h-2.5 rounded-full border border-parchment-200 dark:border-dark-border" style={{ backgroundColor: note.color }} aria-hidden="true" />}
                </button>
                {showColors && (
                  <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-panel p-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {NOTE_LABEL_COLORS.map(({ value, label, swatch }) => {
                        const isSelected = (note.color ?? null) === value
                        return (
                          <button key={value ?? 'none'} onMouseDown={keepEditorFocus} onClick={() => handleColorSelect(value)} className={`w-6 h-6 rounded-full border transition-colors ${isSelected ? 'border-sage ring-1 ring-sage' : 'border-parchment-200 dark:border-dark-border hover:border-sage'}`} style={{ backgroundColor: swatch }} aria-label={label} title={label} />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {!isGuest && (
                <button onMouseDown={keepEditorFocus} onClick={handleToggleShare} className={toolbarBtn(note?.shared ?? false)} aria-label={note?.shared ? 'Unshare note' : 'Share note'} title={note?.shared ? 'Unshare note' : 'Share note'}><Share2 size={13} /></button>
              )}

              {isOwner && (
                <div className="relative" ref={lockRef}>
                  <button onMouseDown={keepEditorFocus} onClick={handleToggleLockMenu} className={toolbarBtn(showLockMenu || Boolean(note?.locked))} aria-label={note?.locked ? 'Manage note lock' : 'Lock note'} aria-pressed={showLockMenu} title={note?.locked ? 'Manage note lock' : 'Lock note'}><Lock size={13} /></button>
                  {showLockMenu && (
                    <div className="absolute top-full left-0 mt-2 z-30 w-72 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-panel p-3">
                      <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">{note?.locked ? 'Unlock note' : 'Lock note'}</p>
                      {!note?.locked && !masterPinSet ? (
                        <>
                          <p className="text-xs text-ink-muted dark:text-dark-muted mb-3">Set a master PIN first</p>
                          <button
                            type="button"
                            onMouseDown={keepEditorFocus}
                            onClick={handleLockToggle}
                            className="w-full px-3 py-2 rounded-md border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text text-xs font-medium hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
                          >
                            Set Master PIN
                          </button>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onMouseDown={keepEditorFocus}
                            onClick={handleLockToggle}
                            className="w-full px-3 py-2 rounded-md bg-sage text-white text-xs font-medium hover:bg-sage-light transition-colors"
                          >
                            {note?.locked ? 'Unlock Note' : 'Lock Note'}
                          </button>
                          {note?.locked && isUnlocked && (
                            <button
                              type="button"
                              onMouseDown={keepEditorFocus}
                              onClick={() => {
                                onRelockCurrentNote?.()
                                setShowLockMenu(false)
                              }}
                              className="w-full px-3 py-2 rounded-md border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text text-xs font-medium hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
                            >
                              Re-lock Note
                            </button>
                          )}
                        </div>
                      )}

                      {lockNotice && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{lockNotice}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isOwner && !isGuest && (
                <div className="relative" ref={collaboratorsRef}>
                  <button onMouseDown={keepEditorFocus} onClick={() => setShowCollaborators((v) => !v)} className={toolbarBtn(showCollaborators)} aria-label="Manage collaborators" aria-pressed={showCollaborators} title="Collaborators"><Users size={13} /></button>
                  {showCollaborators && (
                    <div className="absolute top-full left-0 mt-2 z-30 w-80 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-panel p-3">
                      <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">Collaborators</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3">
                        {collaborators.length === 0 ? (
                          <p className="text-xs text-ink-muted dark:text-dark-muted">No collaborators yet.</p>
                        ) : (
                          collaborators.map((email) => (
                            <div key={email} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-parchment-100 dark:bg-dark-bg">
                              <span className="text-xs text-ink dark:text-dark-text truncate">{email}</span>
                              <button onMouseDown={keepEditorFocus} onClick={() => handleRemoveCollaborator(email)} className="p-1 rounded-md text-ink-muted dark:text-dark-muted hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors" aria-label={`Remove collaborator ${email}`} title={`Remove ${email}`}><X size={12} /></button>
                            </div>
                          ))
                        )}
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); handleAddCollaborator() }} className="flex items-center gap-2">
                        <input type="email" value={collaboratorEmail} onChange={(e) => setCollaboratorEmail(e.target.value)} placeholder="Add collaborator email" className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage" />
                        <button type="submit" className="px-2.5 py-1.5 text-xs rounded-md bg-sage text-white hover:bg-sage-light transition-colors" title="Add collaborator">Add</button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              <button onMouseDown={keepEditorFocus} onClick={handleImageButtonClick} className={toolbarBtn(false)} aria-label="Upload image" title="Upload image"><ImageIcon size={13} /></button>
              {!isGuest && (
                <button onMouseDown={keepEditorFocus} onClick={handleSummarize} disabled={summaryLoading} className={`${toolbarBtn(false)} ${summaryLoading ? 'opacity-60 cursor-wait' : ''}`} aria-label="Generate AI summary" title="Generate AI summary">{summaryLoading ? <span className="w-3 h-3 border-2 border-sage border-t-transparent rounded-full animate-spin" /> : <Sparkles size={13} />}</button>
              )}

              <div className="relative" ref={templateRef}>
                <button onMouseDown={keepEditorFocus} onClick={() => setShowTemplates((v) => !v)} className={toolbarBtn(showTemplates)} aria-label="Insert template" aria-pressed={showTemplates} title="Insert template"><LayoutTemplate size={13} /></button>
                {showTemplates && (
                  <div className="absolute top-full left-0 mt-2 z-30 bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded-lg shadow-lg p-4 w-96">
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">Choose a template:</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mb-3">⚠ This will replace your current note content</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                      {TEMPLATES.map((template) => {
                        const IconComponent = template.icon
                        return (
                          <button key={template.id} onMouseDown={keepEditorFocus} onClick={() => handleApplyTemplate(template)} className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border hover:border-sage hover:bg-sage-pale dark:hover:bg-sage/10 transition-colors text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <IconComponent size={14} className="text-sage flex-shrink-0" />
                              <span className="text-xs font-medium text-ink dark:text-dark-text truncate">{template.title}</span>
                            </div>
                            <p className="text-xs text-ink-muted dark:text-dark-muted line-clamp-2">{template.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button onMouseDown={keepEditorFocus} onClick={() => exportNote('md')} className={toolbarBtn(false)} aria-label="Export as markdown" title="Export markdown"><Download size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => exportNote('txt')} className={toolbarBtn(false)} aria-label="Export as text" title="Export text"><Download size={13} /></button>
              <button onMouseDown={keepEditorFocus} onClick={() => exportNote('pdf')} className={toolbarBtn(false)} aria-label="Export as pdf" title="Export pdf"><Download size={13} /></button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-muted dark:text-dark-muted">History: {formatHistorySavedAt(lastHistorySavedAt)}</span>
              <span className="text-xs text-ink-muted dark:text-dark-muted">{wordCount} words</span>
              <span className={`text-xs transition-opacity duration-300 ${saved ? 'text-sage opacity-80' : 'text-ink-muted dark:text-dark-muted opacity-100'}`} aria-live="polite">{saved ? '✓ Saved' : 'Saving...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB and bottom sheet */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsBottomSheetOpen((v) => !v)}
          className="fixed bottom-24 right-4 z-[60] w-[52px] h-[52px] rounded-full bg-sage text-white shadow-lg hover:bg-sage-light transition-colors flex items-center justify-center"
          aria-label={isBottomSheetOpen ? 'Close toolbar actions' : 'Open toolbar actions'}
          title={isBottomSheetOpen ? 'Close actions' : 'Open actions'}
        >
          <Plus size={22} className={isBottomSheetOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
        </button>

        {isBottomSheetOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsBottomSheetOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white dark:bg-dark-surface border-t border-parchment-200 dark:border-dark-border px-4 pt-3 pb-6 max-h-[60vh] overflow-y-auto animate-bottom-sheet-up">
              <div className="w-12 h-1.5 rounded-full bg-parchment-300 dark:bg-dark-border mx-auto mb-4" />

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-ink-muted dark:text-dark-muted mb-2">Text formatting</p>
                  <div className="grid grid-cols-4 gap-2 justify-items-center">
                    {mobileSheetBtn('Bold', <Bold size={15} />, () => editor?.chain().focus().toggleBold().run(), editor?.isActive('bold'))}
                    {mobileSheetBtn('Italic', <Italic size={15} />, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive('italic'))}
                    {mobileSheetBtn('Under', <UnderlineIcon size={15} />, () => editor?.chain().focus().toggleUnderline().run(), editor?.isActive('underline'), false, 'Underline')}
                    {mobileSheetBtn('Strike', <Strikethrough size={15} />, () => editor?.chain().focus().toggleStrike().run(), editor?.isActive('strike'), false, 'Strikethrough')}
                    {mobileSheetBtn('Hi-lite', <Highlighter size={15} />, () => editor?.chain().focus().toggleHighlight().run(), editor?.isActive('highlight'), false, 'Highlight')}
                    {mobileSheetBtn('Color', <Palette size={15} />, () => setShowTextColors((v) => !v), showTextColors, false, 'Text color')}
                    {mobileSheetBtn('Size', <Type size={15} />, () => setShowFontSize((v) => !v), showFontSize, false, 'Font size')}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted dark:text-dark-muted mb-2">Insert and structure</p>
                  <div className="grid grid-cols-4 gap-2 justify-items-center">
                    {mobileSheetBtn('H1', <Heading1 size={15} />, () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), editor?.isActive('heading', { level: 1 }), false, 'Heading 1')}
                    {mobileSheetBtn('H2', <Heading2 size={15} />, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive('heading', { level: 2 }), false, 'Heading 2')}
                    {mobileSheetBtn('Bullet', <List size={15} />, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'), false, 'Bullet list')}
                    {mobileSheetBtn('Order', <ListOrdered size={15} />, () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'), false, 'Ordered list')}
                    {mobileSheetBtn('Quote', <Quote size={15} />, () => editor?.chain().focus().toggleBlockquote().run(), editor?.isActive('blockquote'), false, 'Blockquote')}
                    {mobileSheetBtn('Image', <ImageIcon size={15} />, handleImageButtonClick, false, false, 'Insert image')}
                    {!isGuest && mobileSheetBtn('Voice', isRecording ? <MicOff size={15} /> : <Mic size={15} />, handleMicClick, isRecording, false, isRecording ? 'Stop voice input' : 'Start voice input')}
                    {mobileSheetBtn('Temp', <LayoutTemplate size={15} />, () => setShowTemplates((v) => !v), showTemplates, false, 'Template')}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted dark:text-dark-muted mb-2">Actions</p>
                  <div className="grid grid-cols-4 gap-2 justify-items-center">
                    {mobileSheetBtn('Label', <Palette size={15} />, () => setShowColors((v) => !v), showColors, false, 'Note label')}
                    {!isGuest && mobileSheetBtn('Share', <Share2 size={15} />, handleToggleShare, note?.shared ?? false, false, note?.shared ? 'Unshare' : 'Share')}
                    {isOwner && !isGuest && mobileSheetBtn('Collab', <Users size={15} />, () => setShowCollaborators((v) => !v), showCollaborators, false, 'Collaborators')}
                    {isOwner && mobileSheetBtn(note?.locked ? 'Unlock' : 'Lock', <Lock size={15} />, handleToggleLockMenu, showLockMenu || Boolean(note?.locked), false, note?.locked ? 'Manage lock' : 'Lock note')}
                    {!isGuest && mobileSheetBtn('AI', <Sparkles size={15} />, handleSummarize, false, summaryLoading, 'Summarise')}
                    {mobileSheetBtn('Export', <Download size={15} />, () => exportNote('md'), false, false, 'Export markdown')}
                  </div>
                </div>

                {showLockMenu && isOwner && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">{note?.locked ? 'Unlock note' : 'Lock note'}</p>
                    {!note?.locked && !masterPinSet ? (
                      <>
                        <p className="text-xs text-ink-muted dark:text-dark-muted mb-2">Set a master PIN first</p>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={handleLockToggle}
                          style={{ touchAction: 'manipulation' }}
                          className="w-full min-h-12 rounded-md border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text text-xs font-medium"
                        >
                          Set Master PIN
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={handleLockToggle}
                          style={{ touchAction: 'manipulation' }}
                          className="mt-1 w-full min-h-12 rounded-md bg-sage text-white text-xs font-medium"
                        >
                          {note?.locked ? 'Unlock Note' : 'Lock Note'}
                        </button>
                        {note?.locked && isUnlocked && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={() => {
                              onRelockCurrentNote?.()
                              setShowLockMenu(false)
                            }}
                            style={{ touchAction: 'manipulation' }}
                            className="w-full min-h-12 rounded-md border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text text-xs font-medium"
                          >
                            Re-lock Note
                          </button>
                        )}
                      </div>
                    )}

                    {lockNotice && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{lockNotice}</p>}
                  </div>
                )}

                {!isOwner && showCollaborators && (
                  <p className="text-xs text-ink-muted dark:text-dark-muted">Only note owner can manage collaborators.</p>
                )}

                {showTextColors && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-medium text-ink dark:text-dark-text mb-2">Text color</p>
                    <div className="grid grid-cols-8 gap-1.5">
                      {TEXT_COLORS.map((color) => (
                        <button
                          key={color}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={() => {
                            editor?.chain().focus().setColor(color).run()
                            setShowTextColors(false)
                          }}
                          style={{ touchAction: 'manipulation', backgroundColor: color }}
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${activeTextColor === color ? 'ring-1 ring-sage border-sage' : 'border-parchment-200 dark:border-dark-border'}`}
                          aria-label={`Set text color ${color}`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showFontSize && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-medium text-ink dark:text-dark-text mb-2">Font size</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FONT_SIZES.map(({ label, value }) => (
                        <button
                          key={value}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={() => handleSetFontSize(value)}
                          style={{ touchAction: 'manipulation' }}
                          className={`min-w-12 min-h-12 px-3 py-2 text-xs rounded-md border transition-colors ${getCurrentFontSize() === value ? 'border-sage text-sage bg-sage/10' : 'border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showColors && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-medium text-ink dark:text-dark-text mb-2">Note label</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {NOTE_LABEL_COLORS.map(({ value, label, swatch }) => (
                        <button
                          key={value ?? 'none'}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={() => handleColorSelect(value)}
                          style={{ touchAction: 'manipulation', backgroundColor: swatch }}
                          className={`w-12 h-12 rounded-xl border ${((note.color ?? null) === value) ? 'border-sage ring-1 ring-sage' : 'border-parchment-200 dark:border-dark-border'}`}
                          aria-label={label}
                          title={label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showCollaborators && isOwner && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">Collaborators</p>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto mb-3">
                      {collaborators.length === 0 ? (
                        <p className="text-xs text-ink-muted dark:text-dark-muted">No collaborators yet.</p>
                      ) : (
                        collaborators.map((email) => (
                          <div key={email} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-parchment-100 dark:bg-dark-bg">
                            <span className="text-xs text-ink dark:text-dark-text truncate">{email}</span>
                            <button onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} onClick={() => handleRemoveCollaborator(email)} style={{ touchAction: 'manipulation' }} className="w-12 h-12 rounded-md text-ink-muted dark:text-dark-muted flex items-center justify-center" aria-label={`Remove collaborator ${email}`}>
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddCollaborator() }} className="flex items-center gap-2">
                      <input type="email" value={collaboratorEmail} onChange={(e) => setCollaboratorEmail(e.target.value)} placeholder="Add collaborator email" className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg text-ink dark:text-dark-text outline-none focus:border-sage" />
                      <button type="submit" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} style={{ touchAction: 'manipulation' }} className="w-12 h-12 text-xs rounded-md bg-sage text-white">Add</button>
                    </form>
                  </div>
                )}

                {showTemplates && (
                  <div className="p-3 rounded-lg border border-parchment-200 dark:border-dark-border">
                    <p className="text-xs font-semibold text-ink dark:text-dark-text mb-2">Templates</p>
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                      {TEMPLATES.map((template) => {
                        const IconComponent = template.icon
                        return (
                          <button
                            key={template.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={() => { handleApplyTemplate(template); setShowTemplates(false) }}
                            style={{ touchAction: 'manipulation' }}
                            className="min-h-12 min-w-12 p-2 rounded-md border border-parchment-200 dark:border-dark-border text-left"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <IconComponent size={12} className="text-sage" />
                              <span className="text-[11px] font-medium text-ink dark:text-dark-text">{template.title}</span>
                            </div>
                            <p className="text-[10px] text-ink-muted dark:text-dark-muted line-clamp-2">{template.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Share link display */}
      {note?.shared && (
        <div className="px-6 py-2.5 bg-sage-pale dark:bg-sage/10 border-b border-parchment-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-sage dark:text-sage-light">Public link:</span>
            <code className="text-xs bg-white dark:bg-dark-surface px-2 py-1 rounded border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text overflow-hidden">
              https://noteflow-4a39e.web.app/shared/{note.id}
            </code>
            <button
              onClick={handleCopyShareLink}
              className="ml-auto px-2.5 py-1 text-xs rounded-md font-medium transition-colors
                       bg-sage text-white hover:bg-sage-light dark:hover:bg-sage
                       disabled:opacity-50"
            >
              {linkCopied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="px-6 py-3 border-b border-parchment-200 dark:border-dark-border">
        <div className="flex flex-wrap items-center gap-2">
          {(note.tags ?? []).map((tag) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sage-pale text-sage dark:bg-sage/20 dark:text-sage-light hover:bg-sage/25 transition-colors"
              title="Remove tag"
            >
              {tag}
              <X size={12} />
            </button>
          ))}

          {!showTagInput && (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-dashed border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors"
            >
              + Add tag
            </button>
          )}

          {showTagInput && (
            <div ref={tagInputWrapRef} className="inline-flex items-center">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Tag"
                className="w-32 px-2.5 py-1 text-xs rounded-full border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface text-ink dark:text-dark-text placeholder:text-ink-muted dark:placeholder:text-dark-muted outline-none focus:border-sage"
                aria-label="Add tag"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-8">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full font-serif text-3xl font-semibold text-ink dark:text-dark-text bg-transparent
                       border-none outline-none placeholder:text-ink-muted/40 dark:placeholder:text-dark-muted/50 mb-6
                       leading-tight"
            aria-label="Note title"
          />

          {/* Summary display */}
          {note?.summary && (
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="text-sm italic text-ink-muted dark:text-dark-muted">
                <strong className="not-italic text-ink dark:text-dark-text">Summary:</strong> {note.summary}
              </p>
              <button
                onClick={() => onUpdate(note.id, { summary: null })}
                className="mt-0.5 p-1 rounded hover:bg-parchment-200 dark:hover:bg-dark-hover transition-colors flex-shrink-0"
                aria-label="Clear summary"
                title="Clear summary"
              >
                <X size={14} className="text-ink-muted dark:text-dark-muted" />
              </button>
            </div>
          )}

          <div className="tiptap-content">
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <p className="text-ink-muted dark:text-dark-muted">Loading editor...</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-2 border-t border-parchment-200 dark:border-dark-border flex-shrink-0">
        <p className="text-[11px] text-ink-muted/60 dark:text-dark-muted/80 font-mono">
          Rich text: bold, headings, lists, alignment, colors, highlight, and quotes
        </p>
      </div>
    </div>
  )
}
