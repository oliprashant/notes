import { useMemo } from 'react'

function toPercent(part, total) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

function formatBytes(bytes = 0) {
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)}GB`
}

export default function UsageMonitorPanel({ usageWarning, storageWarning, queueSize = 0 }) {
  const readPercent = useMemo(() => toPercent(Number(usageWarning?.reads || 0), 50000), [usageWarning?.reads])
  const writePercent = useMemo(() => toPercent(Number(usageWarning?.writes || 0), 20000), [usageWarning?.writes])
  const storagePercent = useMemo(() => {
    const used = Number(storageWarning?.projected || 0)
    const limit = Number(storageWarning?.limit || 0)
    return toPercent(used, limit)
  }, [storageWarning?.limit, storageWarning?.projected])

  return (
    <section className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-950">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Dev usage monitor</p>
        <p>Queue: {queueSize}</p>
      </div>

      <div className="mt-2 space-y-2">
        <div>
          <div className="flex items-center justify-between">
            <span>Reads</span>
            <span>{Number(usageWarning?.reads || 0)} / 50000 ({readPercent}%)</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-blue-200">
            <div className="h-1.5 rounded bg-blue-500" style={{ width: `${readPercent}%` }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span>Writes</span>
            <span>{Number(usageWarning?.writes || 0)} / 20000 ({writePercent}%)</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-blue-200">
            <div className="h-1.5 rounded bg-blue-500" style={{ width: `${writePercent}%` }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span>Storage</span>
            <span>{formatBytes(Number(storageWarning?.projected || 0))} / {formatBytes(Number(storageWarning?.limit || 5 * 1024 * 1024 * 1024))} ({storagePercent}%)</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-blue-200">
            <div className="h-1.5 rounded bg-blue-500" style={{ width: `${storagePercent}%` }} />
          </div>
        </div>
      </div>

      {Array.isArray(usageWarning?.warnings) && usageWarning.warnings.length > 0 && (
        <p className="mt-2 text-amber-700">{usageWarning.warnings.join(' | ')}</p>
      )}
      {storageWarning?.nearLimit && (
        <p className="mt-2 text-amber-700">{storageWarning.message}</p>
      )}
    </section>
  )
}
