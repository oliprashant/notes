import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { compressBeforeUpload } from '../../utils/storageMonitor'

const MAX_IMAGES = 4
const MAX_ORIGINAL_SIZE_BYTES = 1024 * 1024

function bytesToKB(bytes) {
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

export default function ImageUploader({ onChange, disabled = false }) {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    onChange?.(items)
  }, [items, onChange])

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [items])

  const canAddMore = items.length < MAX_IMAGES

  const totalSavedKB = useMemo(() => {
    return Math.round(items.reduce((sum, item) => sum + (item.savedBytes || 0), 0) / 1024)
  }, [items])

  const removeImage = (id) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearAll = () => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
      return []
    })
  }

  const handleFileChange = async (event) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selected.length || disabled || busy) return

    const slots = MAX_IMAGES - items.length
    if (slots <= 0) {
      setError('You can upload up to 4 images per post.')
      return
    }

    const nextFiles = selected.slice(0, slots)
    setBusy(true)
    setError('')

    const processed = []
    for (const file of nextFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed.')
        continue
      }

      if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
        setError('Each original image must be 1MB or less.')
        continue
      }

      try {
        const compressed = await compressBeforeUpload(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1600,
          initialQuality: 0.78,
        })

        processed.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file: compressed.file,
          previewUrl: URL.createObjectURL(compressed.file),
          originalBytes: compressed.originalBytes,
          compressedBytes: compressed.compressedBytes,
          savedBytes: compressed.savedBytes,
        })
      } catch {
        setError('Failed to compress one or more images.')
      }
    }

    setItems((prev) => [...prev, ...processed].slice(0, MAX_IMAGES))
    setBusy(false)
  }

  return (
    <section className="rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink dark:text-dark-text">Images ({items.length}/4)</p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
            disabled={disabled || busy}
          >
            <Trash2 size={12} />
            Cancel upload
          </button>
        )}
      </div>

      <label className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-parchment-200 dark:border-dark-border text-sm ${canAddMore && !disabled ? 'cursor-pointer hover:bg-parchment-100 dark:hover:bg-dark-hover' : 'opacity-60 cursor-not-allowed'}`}>
        <ImagePlus size={14} />
        {busy ? 'Compressing...' : 'Add images'}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={!canAddMore || disabled || busy}
        />
      </label>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="relative rounded-md border border-parchment-200 dark:border-dark-border p-1.5">
              <button
                type="button"
                onClick={() => removeImage(item.id)}
                className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white"
                aria-label="Remove image"
              >
                <X size={10} />
              </button>
              <img src={item.previewUrl} alt="Upload preview" className="h-20 w-full rounded object-cover" loading="lazy" />
              <p className="mt-1 text-[11px] text-ink-muted dark:text-dark-muted">
                {bytesToKB(item.originalBytes)} {'->'} {bytesToKB(item.compressedBytes)}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-muted dark:text-dark-muted">Compression saved about {totalSavedKB}KB in this post.</p>
    </section>
  )
}
