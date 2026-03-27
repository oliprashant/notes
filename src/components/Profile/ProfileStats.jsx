import { CalendarClock, Database, FileText, LogIn, Users } from 'lucide-react'

function formatDate(value) {
  if (!value) return 'Not available'
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString()
}

function formatMb(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 1 ? 2 : 3)} MB`
}

/**
 * @param {{
 * notesCount: number,
 * totalWords: number,
 * followersCount: number,
 * followingCount: number,
 * storageBytes: number,
 * createdAt: any,
 * lastLoginAt: any
 * }} props
 */
export default function ProfileStats({
  notesCount,
  totalWords,
  followersCount,
  followingCount,
  storageBytes,
  createdAt,
  lastLoginAt,
}) {
  const cards = [
    { icon: FileText, label: 'Total notes', value: notesCount },
    { icon: Database, label: 'Total words', value: totalWords.toLocaleString() },
    { icon: Users, label: 'Followers / Following', value: `${followersCount} / ${followingCount}` },
    { icon: CalendarClock, label: 'Joined', value: formatDate(createdAt) },
    { icon: LogIn, label: 'Last login', value: formatDate(lastLoginAt) },
    { icon: Database, label: 'Storage usage', value: formatMb(storageBytes) },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4"
          >
            <div className="flex items-center gap-2 text-ink-muted dark:text-dark-muted text-xs uppercase tracking-wide">
              <Icon size={14} />
              {card.label}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink dark:text-dark-text break-words">{card.value}</p>
          </div>
        )
      })}
    </section>
  )
}
