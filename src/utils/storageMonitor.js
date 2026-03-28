import imageCompression from 'browser-image-compression'

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024
const WARNING_AT_BYTES = 4.5 * 1024 * 1024 * 1024
const STORAGE_MONITOR_KEY = 'noteflow_storage_monitor_v1'

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_MONITOR_KEY)
    if (!raw) return { uploadedBytes: 0, lastUpdatedAt: Date.now() }

    const parsed = JSON.parse(raw)
    return {
      uploadedBytes: Number(parsed.uploadedBytes || 0),
      lastUpdatedAt: Number(parsed.lastUpdatedAt || Date.now()),
    }
  } catch {
    return { uploadedBytes: 0, lastUpdatedAt: Date.now() }
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_MONITOR_KEY, JSON.stringify(state))
  return state
}

export function trackStorageUsage(deltaBytes = 0) {
  const current = readState()
  const next = {
    uploadedBytes: Math.max(0, current.uploadedBytes + Number(deltaBytes || 0)),
    lastUpdatedAt: Date.now(),
  }
  return writeState(next)
}

export async function compressBeforeUpload(file, options = {}) {
  if (!file) throw new Error('File is required for compression.')

  const compressedFile = await imageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? 0.5,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1920,
    useWebWorker: true,
    initialQuality: options.initialQuality ?? 0.8,
  })

  return {
    file: compressedFile,
    originalBytes: file.size,
    compressedBytes: compressedFile.size,
    savedBytes: Math.max(0, file.size - compressedFile.size),
    ratio: file.size > 0 ? compressedFile.size / file.size : 1,
  }
}

export async function deleteOldImages(items = [], deleteFn, maxAgeDays = 30) {
  if (typeof deleteFn !== 'function') return { deleted: 0 }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let deleted = 0

  for (const item of items) {
    const createdAt = new Date(item?.createdAt || 0).getTime()
    const path = item?.path
    if (!path || Number.isNaN(createdAt) || createdAt > cutoff) continue

    try {
      await deleteFn(path)
      deleted += 1
    } catch {
      // Keep cleanup best-effort to avoid breaking user actions.
    }
  }

  return { deleted }
}

export async function showUsageWarning() {
  const state = readState()
  let quota = null

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      quota = await navigator.storage.estimate()
    } catch {
      quota = null
    }
  }

  const projected = state.uploadedBytes
  const warning = projected >= WARNING_AT_BYTES

  return {
    ...state,
    projected,
    limit: STORAGE_LIMIT_BYTES,
    nearLimit: warning,
    message: warning
      ? `Storage is near limit: ${(projected / (1024 * 1024 * 1024)).toFixed(2)}GB / 5GB`
      : 'Storage usage is healthy.',
    browserEstimate: quota,
  }
}

export function getStorageUsage() {
  return readState()
}
