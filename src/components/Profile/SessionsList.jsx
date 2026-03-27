import { Laptop, Loader2, ShieldX } from 'lucide-react'

function formatDate(value) {
  if (!value) return 'Unknown'
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

/**
 * @param {{ sessions: Array<any>, loading: boolean, onRevoke: (sessionId:string)=>Promise<void>, currentSessionId: string }} props
 */
export default function SessionsList({ sessions, loading, onRevoke, currentSessionId }) {
  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <h3 className="text-sm font-semibold text-ink dark:text-dark-text">Active sessions</h3>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-muted dark:text-dark-muted">
          <Loader2 size={14} className="animate-spin" />
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted dark:text-dark-muted">No active sessions tracked.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-md border border-parchment-200 dark:border-dark-border px-3 py-2 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm text-ink dark:text-dark-text inline-flex items-center gap-1">
                  <Laptop size={13} />
                  {session.device || 'Unknown device'} {session.browser ? `(${session.browser})` : ''}
                </p>
                <p className="text-xs text-ink-muted dark:text-dark-muted mt-1">
                  Last active: {formatDate(session.lastActive)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRevoke(session.id)}
                disabled={session.id === currentSessionId}
                className="inline-flex items-center gap-1 text-xs rounded-md border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldX size={12} />
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
