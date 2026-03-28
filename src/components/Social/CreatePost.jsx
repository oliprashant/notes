import { useMemo, useState } from 'react'
import { WifiOff } from 'lucide-react'
import ImageUploader from './ImageUploader'
import { estimatePostCost } from '../../utils/firestoreMonitor'

const MAX_CONTENT = 2000
const MAX_TAGS = 5
const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers only' },
  { value: 'private', label: 'Private' },
]

export default function CreatePost({ onCreate, disabled = false }) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  const usageEstimate = useMemo(() => {
    return estimatePostCost({
      imageCount: images.length,
      tagCount: tags.length,
      withMentions: /@[a-z0-9_]{3,20}/i.test(content),
    })
  }, [content, images.length, tags.length])

  const addTag = () => {
    const nextTag = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (!nextTag || tags.includes(nextTag) || tags.length >= MAX_TAGS) return
    setTags((prev) => [...prev, nextTag])
    setTagInput('')
  }

  const removeTag = (tag) => {
    setTags((prev) => prev.filter((item) => item !== tag))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag()
    }
  }

  const submit = async () => {
    if (disabled || submitting || !online) return

    const trimmed = content.trim()
    if (!trimmed) {
      setError('Post content is required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onCreate?.({
        content: trimmed,
        visibility: privacy,
        tags,
        imageFiles: images.map((item) => item.file),
        imageStats: images.map((item) => ({
          originalBytes: item.originalBytes,
          compressedBytes: item.compressedBytes,
          savedBytes: item.savedBytes,
        })),
      })

      setContent('')
      setPrivacy('public')
      setTags([])
      setTagInput('')
      setImages([])
    } catch (err) {
      setError(err?.message || 'Failed to publish post.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink dark:text-dark-text">Create post</h2>
        {!online && (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <WifiOff size={12} />
            Offline
          </span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, MAX_CONTENT))}
        maxLength={MAX_CONTENT}
        rows={6}
        placeholder="Write in markdown..."
        className="mt-3 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm text-ink dark:text-dark-text"
      />

      <div className="mt-2 flex items-center justify-between text-xs text-ink-muted dark:text-dark-muted">
        <p>{content.length}/{MAX_CONTENT}</p>
        <p>Estimated usage: {usageEstimate.summary}</p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-ink dark:text-dark-text">
          Privacy
          <select
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value)}
            className="mt-1 w-full rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm"
          >
            {PRIVACY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-ink dark:text-dark-text">
          Tags ({tags.length}/5)
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder="Press Enter to add"
            className="mt-1 w-full rounded-md border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm"
            disabled={tags.length >= MAX_TAGS}
          />
        </label>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full bg-sage/10 px-2 py-1 text-xs text-sage"
            >
              #{tag} x
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <ImageUploader onChange={setImages} disabled={disabled || submitting || !online} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || submitting || !online || !content.trim()}
          className="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-light disabled:opacity-60"
        >
          {submitting ? 'Publishing...' : 'Publish post'}
        </button>
      </div>
    </section>
  )
}
