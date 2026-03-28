const READ_DAILY_LIMIT = 50000
const WRITE_DAILY_LIMIT = 20000
const READ_WARNING_AT = 40000
const WRITE_WARNING_AT = 16000
const FIRESTORE_MONITOR_KEY = 'noteflow_firestore_monitor_v1'

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function readState() {
  try {
    const raw = localStorage.getItem(FIRESTORE_MONITOR_KEY)
    if (!raw) {
      return { day: getDayKey(), reads: 0, writes: 0 }
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { day: getDayKey(), reads: 0, writes: 0 }
    }

    if (parsed.day !== getDayKey()) {
      return { day: getDayKey(), reads: 0, writes: 0 }
    }

    return {
      day: parsed.day,
      reads: Number(parsed.reads || 0),
      writes: Number(parsed.writes || 0),
    }
  } catch {
    return { day: getDayKey(), reads: 0, writes: 0 }
  }
}

function writeState(state) {
  localStorage.setItem(FIRESTORE_MONITOR_KEY, JSON.stringify(state))
  return state
}

export function trackDailyReads(count = 1) {
  const current = readState()
  const next = {
    ...current,
    reads: Math.max(0, current.reads + Number(count || 0)),
  }
  return writeState(next)
}

export function trackDailyWrites(count = 1) {
  const current = readState()
  const next = {
    ...current,
    writes: Math.max(0, current.writes + Number(count || 0)),
  }
  return writeState(next)
}

export function warnWhenCloseToLimit() {
  const state = readState()
  const warnings = []

  if (state.reads >= READ_WARNING_AT) {
    warnings.push(`Reads are high: ${state.reads}/${READ_DAILY_LIMIT}`)
  }

  if (state.writes >= WRITE_WARNING_AT) {
    warnings.push(`Writes are high: ${state.writes}/${WRITE_DAILY_LIMIT}`)
  }

  return {
    ...state,
    warnings,
    nearLimit: warnings.length > 0,
  }
}

export function estimatePostCost({ imageCount = 0, tagCount = 0, withMentions = false } = {}) {
  const safeImages = Math.max(0, Math.min(4, Number(imageCount || 0)))
  const safeTags = Math.max(0, Math.min(5, Number(tagCount || 0)))

  const writes = 1 + (withMentions ? 1 : 0)
  const reads = withMentions ? 5 : 0
  const approxBytes = 700 + safeTags * 18 + safeImages * 420

  return {
    reads,
    writes,
    approxBytes,
    summary: `${writes} write(s), ~${reads} read(s), ~${Math.round(approxBytes / 1024)}KB`,
  }
}

export function getFirestoreUsage() {
  return readState()
}
