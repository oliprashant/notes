// src/components/AI/AIAssistant.jsx
// ──────────────────────────────────────────────────────────────
// Collapsible AI chat panel powered by Groq's API.
// The API key is read from the VITE_GROQ_API_KEY env variable.
//
// ⚠️  PRODUCTION WARNING: For a real deployment, proxy this
//     request through your own backend to hide the API key.
// ──────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { X, Send, BotMessageSquare, Sparkles, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const OPENAI_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const OPENAI_MODEL   = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are NoteFlow's built-in AI assistant — thoughtful, precise, and concise.
You help users with their notes: summarising, improving writing, answering questions,
brainstorming ideas, and general assistance. When the user shares a note's content,
treat it as the primary context. Keep answers focused and well-structured.
Use markdown formatting where it improves clarity.`

/** A single chat message bubble */
function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center flex-shrink-0 mt-0.5">
          <BotMessageSquare size={12} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-sage text-white rounded-tr-sm'
            : 'bg-parchment-100 dark:bg-parchment-900/30 text-ink dark:text-dark-text rounded-tl-sm'
          }`}
      >
        {isUser ? (
          /* User messages: plain text */
          formatMessage(message.content)
        ) : (
          /* Assistant messages: markdown */
          <ReactMarkdown
            className="prose-note text-sm leading-relaxed"
            components={{
              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
              ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({children}) => <li className="text-sm">{children}</li>,
              h1: ({children}) => <h1 className="font-serif font-semibold text-base mb-2">{children}</h1>,
              h2: ({children}) => <h2 className="font-serif font-semibold text-sm mb-1">{children}</h2>,
              h3: ({children}) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
              code: ({children}) => <code className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs font-mono">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

/** Very lightweight markdown-to-JSX for chat messages */
function formatMessage(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={j} className="bg-black/10 px-1 rounded text-[12px] font-mono">
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })
}

/** Quick-action prompt chips */
const QUICK_PROMPTS = [
  { label: 'Summarise note',   prompt: 'Please summarise my current note in 3–5 sentences.' },
  { label: 'Improve writing',  prompt: 'Review my note and suggest improvements to the writing style and clarity.' },
  { label: 'Fix grammar',      prompt: 'Fix any grammar or spelling mistakes in my note.' },
  { label: 'Suggest headings', prompt: 'Suggest a better heading structure for my note using markdown.' },
]

export default function AIAssistant({ open = false, user, selectedNote = null, noteId = null, onClose }) {
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const messagesEndRef                = useRef(null)
  const inputRef                      = useRef(null)
  const noteContext                   = selectedNote ?? null
  const hasNoteContext                = Boolean(noteContext?.id || noteId)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return
    if (!user) { setError('Please sign in to use the AI assistant.'); return }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'gsk_...') {
      setError('No Groq API key found. Add VITE_GROQ_API_KEY to your .env file.')
      return
    }

    const userMessage = { role: 'user', content: userText.trim() }
    const updated     = [...messages, userMessage]
    setMessages(updated)
    setInput('')
    setLoading(true)
    setError(null)

    // Build the API messages array, injecting the selected note as context
    const systemWithNote = noteContext
      ? `${SYSTEM_PROMPT}\n\n---\nThe user's currently open note:\nTitle: ${noteContext.title}\n\n${noteContext.content}`
      : SYSTEM_PROMPT

    const apiMessages = [
      { role: 'system', content: systemWithNote },
      // Keep last 20 messages for context window efficiency
      ...updated.slice(-20).map(m => ({ role: m.role, content: m.content })),
    ]

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model:       OPENAI_MODEL,
          messages:    apiMessages,
          max_tokens:  1000,
          temperature: 0.7,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error?.message ?? `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content ?? '(No response)'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-parchment-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sage flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">AI Assistant</h2>
            <p className="text-[11px] text-ink-muted">{OPENAI_MODEL}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-md text-ink-muted hover:bg-parchment-100 transition-colors"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted hover:bg-parchment-100 transition-colors"
            title="Close AI panel"
            aria-label="Close AI assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {/* Welcome / empty state */}
        {messages.length === 0 && (
          <div className="animate-fade-in">
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-sage-pale flex items-center justify-center mx-auto mb-3">
                <BotMessageSquare size={22} className="text-sage" />
              </div>
              <p className="text-sm font-medium text-ink mb-1">How can I help?</p>
              {noteContext ? (
                <p className="text-xs text-ink-muted">
                  I can see your note <span className="font-medium">"{noteContext.title}"</span>.
                </p>
              ) : (
                <p className="text-xs text-ink-muted">
                  No note selected. You can still chat, brainstorm, or ask general questions.
                </p>
              )}
            </div>

            {/* Quick prompts */}
            {hasNoteContext && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wide px-1 mb-2">
                  Quick actions
                </p>
                {QUICK_PROMPTS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={loading}
                    className="w-full text-left px-3 py-2.5 text-xs text-ink bg-parchment-50
                               border border-parchment-200 rounded-xl hover:border-sage/30
                               hover:bg-sage-pale transition-all duration-150
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {label} →
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center flex-shrink-0">
              <BotMessageSquare size={12} className="text-white" />
            </div>
            <div className="bg-parchment-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-parchment-200 flex-shrink-0"
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask anything… (Shift+Enter for newline)"
            disabled={loading}
            rows={1}
            className="flex-1 px-3 py-2.5 text-sm bg-parchment-50 border border-parchment-200
                       rounded-xl resize-none placeholder:text-ink-muted text-ink
                       outline-none focus:border-sage transition-colors
                       disabled:opacity-60 max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' }}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-sage text-white rounded-xl hover:bg-sage-light
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-ink-muted/60 mt-1.5 text-center">
          Using {OPENAI_MODEL} · Messages are not stored
        </p>
      </form>
    </div>
  )
}
