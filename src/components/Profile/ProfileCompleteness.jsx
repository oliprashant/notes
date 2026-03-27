/**
 * @param {{ percent: number, items: Array<{key:string,label:string,done:boolean}> }} props
 */
export default function ProfileCompleteness({ percent, items }) {
  const missing = items.filter((item) => !item.done)

  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink dark:text-dark-text">Profile completeness</p>
        <p className="text-sm font-semibold text-sage">{percent}%</p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-parchment-200 dark:bg-dark-hover overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sage to-sage-light transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Suggestions</p>
        {missing.length === 0 ? (
          <p className="mt-1 text-sm text-emerald-700">Everything looks complete.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {missing.map((item) => (
              <li
                key={item.key}
                className="text-sm rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1 text-ink-muted dark:text-dark-muted"
              >
                Add {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
