// src/components/Import/FileImport.jsx
// ──────────────────────────────────────────────────────────────
// Modal for importing .txt / .md files as notes.
// Supports drag-and-drop or manual file selection.
// Each file becomes a separate note (title = filename).
// Max file size: 5 MB.
// ──────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function FileImport({ onImport, onClose }) {
  const [dragging, setDragging]   = useState(false)
  const [files,    setFiles]      = useState([])       // staged files
  const [results,  setResults]    = useState(null)     // import results
  const [loading,  setLoading]    = useState(false)
  const inputRef = useRef(null)

  // ── Drag handlers ────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    // Only clear if leaving the zone itself (not a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    addFiles(dropped)
  }, [])

  const handleFileInput = (e) => {
    addFiles(Array.from(e.target.files))
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // Filter and stage valid files
  const addFiles = (newFiles) => {
    const supported = newFiles.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return ['txt', 'md', 'markdown'].includes(ext)
    })
    setFiles(prev => {
      // Deduplicate by name
      const names = new Set(prev.map(f => f.name))
      const unique = supported.filter(f => !names.has(f.name))
      return [...prev, ...unique]
    })
    setResults(null)
  }

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const handleImport = async () => {
    if (!files.length || loading) return
    setLoading(true)
    try {
      const res = await onImport(files)
      setResults(res)
      // Clear files that succeeded
      const failedNames = new Set(
        (res ?? []).filter(r => !r.success).map(r => r.name)
      )
      setFiles(prev => prev.filter(f => failedNames.has(f.name)))
    } finally {
      setLoading(false)
    }
  }

  const allDone = results && results.every(r => r.success)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Import files"
    >
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-parchment-200">
          <div>
            <h2 className="font-semibold text-ink">Import files</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              .txt and .md files — each file becomes a note
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted hover:bg-parchment-100 transition-colors"
            aria-label="Close import dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-150
              ${dragging
                ? 'border-sage bg-sage-pale'
                : 'border-parchment-200 hover:border-sage/50 hover:bg-parchment-50'
              }
            `}
            role="button"
            aria-label="Drop files here or click to select"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown"
              onChange={handleFileInput}
              className="sr-only"
              aria-label="File input"
            />
            <Upload
              size={28}
              className={`mx-auto mb-3 transition-colors ${dragging ? 'text-sage' : 'text-ink-muted'}`}
            />
            <p className="text-sm font-medium text-ink mb-1">
              {dragging ? 'Release to add files' : 'Drop files here'}
            </p>
            <p className="text-xs text-ink-muted">
              or <span className="text-sage underline">browse</span> · max 5 MB per file
            </p>
          </div>

          {/* Staged file list */}
          {files.length > 0 && (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto" aria-label="Files to import">
              {files.map(f => (
                <li
                  key={f.name}
                  className="flex items-center gap-2.5 px-3 py-2 bg-parchment-50
                             border border-parchment-200 rounded-lg"
                >
                  <FileText size={14} className="text-sage flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{f.name}</p>
                    <p className="text-[10px] text-ink-muted">
                      {(f.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="p-1 text-ink-muted hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-1.5 animate-fade-in" aria-live="polite">
              {results.map(r => (
                <div
                  key={r.name}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs
                    ${r.success
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                    }`}
                >
                  {r.success
                    ? <CheckCircle size={13} />
                    : <AlertCircle size={13} />
                  }
                  <span className="font-medium truncate">{r.name}</span>
                  {!r.success && (
                    <span className="ml-auto text-[11px] flex-shrink-0">
                      {r.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {allDone ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-sage text-white text-sm font-medium
                         rounded-xl hover:bg-sage-light transition-colors"
            >
              Done — close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-ink-muted
                           bg-parchment-100 rounded-xl hover:bg-parchment-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!files.length || loading}
                className="flex-1 py-2.5 bg-sage text-white text-sm font-medium
                           rounded-xl hover:bg-sage-light transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Importing…
                  </>
                ) : (
                  `Import ${files.length > 0 ? files.length : ''} ${files.length === 1 ? 'file' : 'files'}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
