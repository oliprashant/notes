import { Sparkles } from 'lucide-react'
import { BADGE_DEFINITIONS } from '../../firebase/profileService'

/**
 * @param {{ badges: Array<{id?:string,key?:string,title?:string,description?:string,earnedAt?:any}> }} props
 */
export default function BadgesGrid({ badges }) {
  const byKey = new Set(badges.map((badge) => badge.key || badge.id))

  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <h3 className="text-sm font-semibold text-ink dark:text-dark-text">Achievements</h3>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Object.values(BADGE_DEFINITIONS).map((badge) => {
          const earned = byKey.has(badge.key)
          return (
            <div
              key={badge.key}
              title={badge.description}
              className={`rounded-lg border p-3 ${
                earned
                  ? `text-white bg-gradient-to-r ${badge.color} border-transparent`
                  : 'border-parchment-200 dark:border-dark-border bg-parchment-50 dark:bg-dark-bg text-ink-muted dark:text-dark-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} />
                <p className="text-sm font-semibold">{badge.title}</p>
              </div>
              <p className="mt-1 text-xs opacity-90">{badge.description}</p>
              <p className="mt-2 text-[11px] uppercase tracking-wide">
                {earned ? 'Unlocked' : 'Locked'}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
