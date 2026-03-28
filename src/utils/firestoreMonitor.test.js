import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  estimatePostCost,
  getFirestoreUsage,
  trackDailyReads,
  trackDailyWrites,
  warnWhenCloseToLimit,
} from './firestoreMonitor'

describe('firestoreMonitor', () => {
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('caps image and tag counts in estimatePostCost', () => {
    const result = estimatePostCost({ imageCount: 100, tagCount: 100, withMentions: true })
    expect(result.reads).toBe(5)
    expect(result.writes).toBe(2)
    expect(result.approxBytes).toBe(700 + 5 * 18 + 4 * 420)
  })

  it('tracks reads and writes in same day', () => {
    trackDailyReads(120)
    trackDailyWrites(40)

    const usage = getFirestoreUsage()
    expect(usage.reads).toBe(120)
    expect(usage.writes).toBe(40)
  })

  it('warns when close to limits', () => {
    trackDailyReads(45000)
    trackDailyWrites(17000)

    const warning = warnWhenCloseToLimit()
    expect(warning.nearLimit).toBe(true)
    expect(warning.warnings.length).toBe(2)
  })

  it('resets stale day counters', () => {
    const yesterday = new Date('2026-03-27T10:00:00.000Z')
    vi.setSystemTime(yesterday)
    trackDailyReads(100)
    trackDailyWrites(50)

    vi.setSystemTime(new Date('2026-03-28T10:00:00.000Z'))
    const usage = getFirestoreUsage()
    expect(usage.reads).toBe(0)
    expect(usage.writes).toBe(0)
  })
})
