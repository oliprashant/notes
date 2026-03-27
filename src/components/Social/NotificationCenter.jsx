import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, Loader2, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  updateNotificationPreferences,
} from '../../firebase/socialService'
import { groupNotifications } from '../../utils/engagementHelpers'

function formatTime(date) {
  if (!date) return 'Now'
  const ts = new Date(date).getTime()
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [prefs, setPrefs] = useState({
    mentioned: true,
    note_liked: true,
    note_commented: true,
    trend_digest: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [toasts, setToasts] = useState([])
  const latestUnreadRef = useRef(0)

  useEffect(() => {
    if (!user?.uid) {
      setItems([])
      setLoading(false)
      return undefined
    }

    getNotificationPreferences(user.uid)
      .then((nextPrefs) => setPrefs(nextPrefs))
      .catch(() => {})

    const unsubscribe = subscribeNotifications(
      user.uid,
      (nextItems) => {
        setItems(nextItems)
        setLoading(false)

        const unread = nextItems.filter((item) => !item.read).length
        if (latestUnreadRef.current > 0 && unread > latestUnreadRef.current) {
          const id = crypto.randomUUID()
          setToasts((prev) => [...prev, { id, message: 'New notification received' }])
          window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id))
          }, 2600)
        }
        latestUnreadRef.current = unread
      },
      () => setLoading(false)
    )

    return unsubscribe
  }, [user?.uid])

  const filteredItems = useMemo(() => {
    return items.filter((item) => prefs[item.type] ?? true)
  }, [items, prefs])

  const groupedItems = useMemo(() => groupNotifications(filteredItems, 90), [filteredItems])

  const unreadCount = useMemo(() => groupedItems.filter((item) => !item.read).length, [groupedItems])

  const unreadBadgeText = unreadCount > 99 ? '99+' : String(unreadCount)

  const togglePreference = async (key) => {
    if (!user?.uid) return
    const nextPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(nextPrefs)
    setSavingPrefs(true)
    try {
      await updateNotificationPreferences(user.uid, nextPrefs)
    } finally {
      setSavingPrefs(false)
    }
  }

  const markAllRead = async () => {
    if (!user?.uid || unreadCount === 0) return
    await markAllNotificationsRead(user.uid)
  }

  const markRead = async (id) => {
    if (!user?.uid) return
    await markNotificationRead(user.uid, id, true)
  }

  return (
    <div className="h-full overflow-y-auto bg-parchment-50 dark:bg-dark-bg p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink dark:text-dark-text">Notifications</h1>
            <p className="text-sm text-ink-muted dark:text-dark-muted">Real-time activity and mentions.</p>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </header>

        <div className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3 text-sm text-ink-muted dark:text-dark-muted inline-flex items-center gap-2">
          <Bell size={14} />
          {unreadBadgeText} unread
        </div>

        <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3">
          <p className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted inline-flex items-center gap-1">
            <Settings2 size={12} /> Notification preferences
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ['mentioned', 'Mentions'],
              ['note_liked', 'Likes'],
              ['note_commented', 'Comments'],
              ['trend_digest', 'Trend digests'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => togglePreference(key)}
                disabled={savingPrefs}
                className={`px-2 py-1 rounded-md text-xs border ${prefs[key] ? 'bg-sage text-white border-sage' : 'border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-dark-muted">
            <Loader2 size={14} className="animate-spin" />
            Loading notifications...
          </div>
        )}

        {!loading && groupedItems.length === 0 && (
          <div className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-5 text-sm text-ink-muted dark:text-dark-muted">
            You are all caught up.
          </div>
        )}

        <div className="space-y-2">
          {groupedItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${item.read ? 'border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface' : 'border-sage/40 bg-sage/5 dark:bg-sage/10'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink dark:text-dark-text">{item.message || 'New activity'}</p>
                  <p className="mt-1 text-xs text-ink-muted dark:text-dark-muted">{formatTime(item.latestAt)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted dark:text-dark-muted">
                    Priority: {item.priority}
                  </p>
                  {item.noteId && (
                    <Link
                      to={`/shared/${item.noteId}`}
                      className="mt-2 inline-flex text-xs text-sage hover:underline"
                    >
                      Open note
                    </Link>
                  )}
                </div>

                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markRead(item.items?.[0]?.id || item.id)}
                    className="px-2 py-1 rounded-md text-xs border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div key={toast.id} className="rounded-md border border-sage/40 bg-sage/10 px-3 py-2 text-xs text-ink dark:text-dark-text">
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
