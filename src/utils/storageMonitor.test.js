import { beforeEach, describe, expect, it } from 'vitest'
import {
  getStorageUsage,
  showUsageWarning,
  trackStorageUsage,
} from './storageMonitor'

describe('storageMonitor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('tracks uploaded bytes cumulatively', () => {
    trackStorageUsage(1024)
    trackStorageUsage(2048)

    const usage = getStorageUsage()
    expect(usage.uploadedBytes).toBe(3072)
  })

  it('warns when usage is near storage limit', async () => {
    const nearLimitBytes = 4.6 * 1024 * 1024 * 1024
    trackStorageUsage(nearLimitBytes)

    const warning = await showUsageWarning()
    expect(warning.nearLimit).toBe(true)
    expect(warning.message.toLowerCase()).toContain('near limit')
  })

  it('returns healthy message when usage is low', async () => {
    trackStorageUsage(1024)

    const warning = await showUsageWarning()
    expect(warning.nearLimit).toBe(false)
    expect(warning.message).toBe('Storage usage is healthy.')
  })
})
