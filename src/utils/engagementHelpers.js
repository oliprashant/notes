const HOUR_MS = 60 * 60 * 1000

function toDate(value) {
  if (!value) return new Date()
  if (typeof value?.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function normalize(value = '') {
  return String(value).toLowerCase().trim()
}

export function scoreFeedNote(note, context = {}) {
  const now = context.now || new Date()
  const createdAt = toDate(note.createdAt)
  const ageHours = Math.max(1, (now.getTime() - createdAt.getTime()) / HOUR_MS)

  const likes = Number(note.likeCount || 0)
  const comments = Number(note.commentCount || 0)
  const bookmarks = Number(note.bookmarkCount || 0)

  const recencyScore = 1 / Math.pow(ageHours, 1.12)
  const engagementScore = likes * 1.8 + comments * 2.3 + bookmarks * 2.0

  const followingIds = context.followingIds || new Set()
  const relationshipScore = followingIds.has(note.uid) ? 4.5 : 0

  const userInterests = context.interestTags || new Set()
  const noteTags = Array.isArray(note.tags) ? note.tags.map(normalize) : []
  const overlap = noteTags.filter((tag) => userInterests.has(tag)).length
  const interestScore = overlap * 2.2

  const score = recencyScore * 15 + engagementScore + relationshipScore + interestScore
  return Number(score.toFixed(4))
}

export function diversifyFeed(notes = []) {
  const pools = {
    relationship: [],
    highEngagement: [],
    fresh: [],
  }

  notes.forEach((note) => {
    if (Number(note.relationshipScore || 0) > 0) {
      pools.relationship.push(note)
      return
    }
    if (Number(note.likeCount || 0) + Number(note.commentCount || 0) >= 10) {
      pools.highEngagement.push(note)
      return
    }
    pools.fresh.push(note)
  })

  const ordered = []
  const strategy = ['relationship', 'highEngagement', 'fresh']

  while (pools.relationship.length || pools.highEngagement.length || pools.fresh.length) {
    strategy.forEach((bucket) => {
      if (pools[bucket].length) ordered.push(pools[bucket].shift())
    })
  }

  return ordered
}

export function getNotificationPriority(item = {}) {
  const type = normalize(item.type)
  if (type === 'mentioned' || type === 'session_security' || type === 'comment_reply') return 'high'
  if (type === 'note_liked' || type === 'note_commented' || type === 'followed_you') return 'medium'
  return 'low'
}

export function groupNotifications(items = [], windowMinutes = 60) {
  const windowMs = windowMinutes * 60 * 1000
  const sorted = [...items].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
  const groups = []

  sorted.forEach((item) => {
    const createdAt = toDate(item.createdAt)
    const actorKey = item.actorUid || 'unknown'
    const key = `${item.type || 'generic'}::${item.noteId || 'none'}`

    const group = groups.find((candidate) => {
      if (candidate.key !== key) return false
      const delta = Math.abs(candidate.latestAt.getTime() - createdAt.getTime())
      return delta <= windowMs
    })

    if (!group) {
      groups.push({
        id: item.id,
        key,
        noteId: item.noteId || null,
        read: Boolean(item.read),
        latestAt: createdAt,
        type: item.type || 'generic',
        message: item.message || 'New activity',
        actors: new Set([actorKey]),
        items: [item],
      })
      return
    }

    group.items.push(item)
    group.read = group.read && Boolean(item.read)
    group.latestAt = group.latestAt > createdAt ? group.latestAt : createdAt
    group.actors.add(actorKey)
  })

  return groups.map((group) => {
    const actorCount = group.actors.size
    let message = group.message

    if (group.items.length > 1 && group.type === 'note_liked') {
      message = `${actorCount} people liked your note`
    }
    if (group.items.length > 1 && group.type === 'note_commented') {
      message = `${actorCount} people commented on your note`
    }

    return {
      id: group.id,
      noteId: group.noteId,
      latestAt: group.latestAt,
      read: group.read,
      type: group.type,
      message,
      count: group.items.length,
      priority: getNotificationPriority(group),
      items: group.items,
    }
  })
}

export function highlightText(text = '', query = '') {
  if (!query?.trim()) return [{ text, matched: false }]

  const escaped = query
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

  if (!escaped) return [{ text, matched: false }]

  const regex = new RegExp(`(${escaped})`, 'ig')
  const chunks = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({ text: text.slice(lastIndex, match.index), matched: false })
    }
    chunks.push({ text: match[0], matched: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    chunks.push({ text: text.slice(lastIndex), matched: false })
  }

  return chunks.length ? chunks : [{ text, matched: false }]
}
