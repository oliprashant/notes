const DAY_MS = 24 * 60 * 60 * 1000

function toDateLike(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function calculateProfileCompleteness(profile = {}) {
  const social = profile.social || {}
  const checks = [
    { key: 'displayName', label: 'Display name', done: Boolean(profile.displayName) },
    { key: 'bio', label: 'Bio', done: Boolean(profile.bio) },
    { key: 'hobby', label: 'Hobby', done: Boolean(profile.hobby) },
    { key: 'username', label: 'Username', done: Boolean(profile.username) },
    { key: 'photoURL', label: 'Profile photo', done: Boolean(profile.photoURL) },
    { key: 'github', label: 'GitHub link', done: Boolean(social.github) },
    { key: 'twitter', label: 'Twitter link', done: Boolean(social.twitter) },
    { key: 'linkedin', label: 'LinkedIn link', done: Boolean(social.linkedin) },
    { key: 'website', label: 'Website link', done: Boolean(social.website) },
  ]

  const doneCount = checks.filter((item) => item.done).length
  return {
    percent: Math.round((doneCount / checks.length) * 100),
    items: checks,
  }
}

export function hasSevenDayStreak(activeDays = []) {
  if (!activeDays.length) return false
  const days = activeDays.map((d) => new Date(`${d}T00:00:00Z`).getTime()).sort((a, b) => a - b)
  let streak = 1

  for (let i = 1; i < days.length; i += 1) {
    const delta = Math.round((days[i] - days[i - 1]) / DAY_MS)
    if (delta === 1) streak += 1
    else if (delta > 1) streak = 1
    if (streak >= 7) return true
  }

  return false
}

export function checkEarnedBadges({ profile = {}, notesCount = 0, activeDays = [], completenessPercent = 0 }) {
  const social = profile.social || {}
  const hasAllSocial = Boolean(social.github && social.twitter && social.linkedin && social.website)

  return [
    notesCount >= 1 ? 'firstNote' : null,
    notesCount >= 10 ? 'noteCollector10' : null,
    notesCount >= 50 ? 'noteCollector50' : null,
    notesCount >= 100 ? 'noteCollector100' : null,
    hasSevenDayStreak(activeDays) ? 'streak7' : null,
    hasAllSocial ? 'socialButterfly' : null,
    completenessPercent >= 100 ? 'profilePro' : null,
  ].filter(Boolean)
}

export function calculateTrendingNotes(notes = [], now = new Date()) {
  const nowMs = now.getTime()

  return [...notes]
    .map((note) => {
      const createdAt = toDateLike(note.createdAt) || new Date(nowMs)
      const ageHours = Math.max(1, (nowMs - createdAt.getTime()) / (60 * 60 * 1000))
      const likes = Number(note.likeCount || 0)
      const comments = Number(note.commentCount || 0)
      const bookmarks = Number(note.bookmarkCount || 0)

      // Lightweight hot score tuned for recent engagement in a free-tier app.
      const score = (likes * 2 + comments * 3 + bookmarks * 2 + 1) / Math.pow(ageHours, 1.15)
      return { ...note, trendingScore: Number(score.toFixed(4)) }
    })
    .sort((a, b) => b.trendingScore - a.trendingScore)
}
