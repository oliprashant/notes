import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  MessageCircleMore,
  Plus,
  Upload,
  UserCircle2,
} from 'lucide-react'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '../../hooks/useAuth'
import { useDarkMode } from '../../hooks/useDarkMode'
import { storage } from '../../firebase/config'
import { generateTOTPSecret, generateBackupCodes } from '../../utils/totpUtils'
import {
  calculateCompleteness,
  checkIsFollowing,
  checkUsernameAvailability,
  followUser,
  getOrCreateSessionId,
  getFollowerFollowingCounts,
  getNotesAggregate,
  getUserBadges,
  getUserProfileById,
  listActiveSessions,
  normalizeUrl,
  normalizeUsername,
  recordLoginHeartbeat,
  revokeSession,
  saveProfileWithUsername,
  syncBadges,
  unfollowUser,
  upsertSessionPresence,
  validateOptionalUrl,
  validateUsername,
} from '../../firebase/profileService'
import ProfileStats from './ProfileStats'
import ProfileCompleteness from './ProfileCompleteness'
import SocialLinks from './SocialLinks'
import BadgesGrid from './BadgesGrid'
import SessionsList from './SessionsList'
import FollowButton from './FollowButton'
import TwoFASetup from './2FASetup'

const BIO_MAX = 120
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function getBrowserName() {
  const ua = navigator.userAgent || ''
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari'
  return 'Unknown'
}

function toErrorMessage(error) {
  if (!error) return 'Something went wrong.'
  if (typeof error === 'string') return error
  return error.message || 'Something went wrong.'
}

function randomBackupCodes() {
  return generateBackupCodes(8)
}

/**
 * Comprehensive profile page with social, analytics, sessions, and security controls.
 *
 * @param {{ viewedUserId?: string | null }} props
 */
export default function ProfilePage({ viewedUserId = null }) {
  const { user, signOutUser } = useAuth()
  const { userId: userIdFromRoute } = useParams()
  const { isDark, setIsDark } = useDarkMode()

  const targetUid = viewedUserId || userIdFromRoute || user?.uid || null
  const isOwnProfile = Boolean(user?.uid && targetUid && user.uid === targetUid)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameState, setUsernameState] = useState({ available: true, message: '' })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    hobby: '',
    photoURL: '',
    photoPath: '',
    visibility: 'private',
    themePreference: isDark ? 'dark' : 'light',
    social: {
      github: '',
      twitter: '',
      linkedin: '',
      website: '',
    },
    createdAt: null,
    lastLoginAt: null,
    twoFactorEnabled: false,
    backupCodes: [],
  })

  const [snapshotProfile, setSnapshotProfile] = useState(null)
  const [profileStats, setProfileStats] = useState({
    notesCount: 0,
    totalWords: 0,
    storageBytes: 0,
    followersCount: 0,
    followingCount: 0,
  })
  const [badges, setBadges] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPreview, setShowPreview] = useState(false)

  const [toasts, setToasts] = useState([])
  const pushToast = useCallback((type, message) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const currentSessionId = useMemo(() => {
    if (!user?.uid || !isOwnProfile) return ''
    return getOrCreateSessionId(user.uid)
  }, [user?.uid, isOwnProfile])

  const completeness = useMemo(() => calculateCompleteness(profile), [profile])

  const loadPage = useCallback(async () => {
    if (!targetUid) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [profileDoc, aggregate, followCounts, badgeList] = await Promise.all([
        getUserProfileById(targetUid),
        getNotesAggregate(targetUid),
        getFollowerFollowingCounts(targetUid),
        getUserBadges(targetUid),
      ])

      if (!profileDoc) {
        setProfile((prev) => ({ ...prev, displayName: 'Unknown user' }))
        setSnapshotProfile(null)
      } else {
        const hydratedProfile = {
          displayName: profileDoc.displayName || user?.displayName || '',
          username: profileDoc.username || '',
          bio: profileDoc.bio || '',
          hobby: profileDoc.hobby || '',
          photoURL: profileDoc.photoURL || user?.photoURL || '',
          photoPath: profileDoc.photoPath || '',
          visibility: profileDoc.visibility || 'private',
          themePreference: profileDoc.themePreference || (isDark ? 'dark' : 'light'),
          social: {
            github: profileDoc.social?.github || '',
            twitter: profileDoc.social?.twitter || '',
            linkedin: profileDoc.social?.linkedin || '',
            website: profileDoc.social?.website || '',
          },
          createdAt: profileDoc.createdAt || null,
          lastLoginAt: profileDoc.lastLoginAt || null,
          twoFactorEnabled: Boolean(profileDoc.twoFactorEnabled),
          backupCodes: Array.isArray(profileDoc.backupCodes) ? profileDoc.backupCodes : [],
        }

        setProfile(hydratedProfile)
        setSnapshotProfile(hydratedProfile)
      }

      setProfileStats({
        notesCount: aggregate.notesCount,
        totalWords: aggregate.totalWords,
        storageBytes: aggregate.totalBytes,
        followersCount: followCounts.followersCount,
        followingCount: followCounts.followingCount,
      })
      setBadges(badgeList)

      if (user?.uid && targetUid !== user.uid) {
        const following = await checkIsFollowing(user.uid, targetUid)
        setIsFollowing(following)
      }

      if (isOwnProfile && user?.uid) {
        setSessionsLoading(true)
        const [activeSessions] = await Promise.all([
          listActiveSessions(user.uid),
          upsertSessionPresence(user.uid, currentSessionId, {
            device: navigator.platform || 'Unknown device',
            browser: getBrowserName(),
          }),
        ])
        setSessions(activeSessions)
        setSessionsLoading(false)

        await recordLoginHeartbeat(user.uid, {
          sessionId: currentSessionId,
          device: navigator.platform || 'Unknown device',
          browser: getBrowserName(),
        })
      }
    } catch (error) {
      pushToast('error', toErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [targetUid, user?.uid, user?.displayName, user?.photoURL, isDark, isOwnProfile, currentSessionId, pushToast])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!isOwnProfile || !user?.uid) return
    const normalized = normalizeUsername(profile.username)
    if (!normalized) {
      setUsernameState({ available: false, message: 'Username is required.' })
      return
    }

    const validation = validateUsername(normalized)
    if (validation) {
      setUsernameState({ available: false, message: validation })
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        setCheckingUsername(true)
        const availability = await checkUsernameAvailability(normalized, user.uid)
        setUsernameState({
          available: availability.available,
          message: availability.available ? 'Username available.' : availability.reason || 'Username unavailable.',
        })
      } catch (error) {
        setUsernameState({ available: false, message: toErrorMessage(error) })
      } finally {
        setCheckingUsername(false)
      }
    }, 450)

    return () => window.clearTimeout(timer)
  }, [isOwnProfile, profile.username, user?.uid])

  const validateForm = () => {
    const nextErrors = {}
    if (!profile.displayName.trim()) nextErrors.displayName = 'Display name is required.'
    if (profile.bio.length > BIO_MAX) nextErrors.bio = `Bio must be ${BIO_MAX} characters or fewer.`

    const usernameError = validateUsername(profile.username)
    if (usernameError) nextErrors.username = usernameError

    const social = profile.social || {}
    ;['github', 'twitter', 'linkedin', 'website'].forEach((key) => {
      const urlError = validateOptionalUrl(social[key])
      if (urlError) nextErrors[key] = urlError
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSave = async (event) => {
    event.preventDefault()
    if (!isOwnProfile || !user?.uid) return

    if (!validateForm()) {
      pushToast('error', 'Please fix validation errors before saving.')
      return
    }

    if (!usernameState.available) {
      pushToast('error', 'Please choose an available username.')
      return
    }

    setSaving(true)
    try {
      const social = profile.social || {}
      const payload = {
        displayName: profile.displayName.trim(),
        bio: profile.bio.trim(),
        hobby: profile.hobby.trim(),
        visibility: profile.visibility,
        themePreference: profile.themePreference,
        photoURL: profile.photoURL,
        photoPath: profile.photoPath,
        social: {
          github: normalizeUrl(social.github),
          twitter: normalizeUrl(social.twitter),
          linkedin: normalizeUrl(social.linkedin),
          website: normalizeUrl(social.website),
        },
        twoFactorEnabled: profile.twoFactorEnabled,
        backupCodes: profile.backupCodes,
        email: user.email || '',
      }

      await saveProfileWithUsername(
        user.uid,
        payload,
        profile.username,
        snapshotProfile?.username || ''
      )

      await syncBadges(user.uid, payload, {
        notesCount: profileStats.notesCount,
        activeDays: [],
      }, completeness.percent)

      pushToast('success', 'Profile saved.')
      await loadPage()
    } catch (error) {
      pushToast('error', toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const onUploadPhoto = async (event) => {
    if (!isOwnProfile || !user?.uid) return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      pushToast('error', 'Please upload an image file.')
      return
    }

    if (file.size > MAX_PHOTO_BYTES) {
      pushToast('error', 'Maximum profile photo size is 5MB.')
      return
    }

    setUploadingPhoto(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const path = `profilePhotos/${user.uid}/${Date.now()}-${safeName}`
      const uploadedRef = ref(storage, path)
      await uploadBytes(uploadedRef, file)
      const photoURL = await getDownloadURL(uploadedRef)

      const previousPath = profile.photoPath
      if (previousPath) {
        await deleteObject(ref(storage, previousPath)).catch(() => {})
      }

      setProfile((prev) => ({ ...prev, photoURL, photoPath: path }))
      setProfileStats((prev) => ({ ...prev, storageBytes: prev.storageBytes + file.size }))
      pushToast('success', 'Photo uploaded. Save profile to persist all changes.')
    } catch (error) {
      pushToast('error', toErrorMessage(error))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const toggleFollow = async () => {
    if (!user?.uid || !targetUid || isOwnProfile) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, targetUid)
        setIsFollowing(false)
        setProfileStats((prev) => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }))
      } else {
        await followUser(user.uid, targetUid)
        setIsFollowing(true)
        setProfileStats((prev) => ({ ...prev, followersCount: prev.followersCount + 1 }))
      }
    } catch (error) {
      pushToast('error', toErrorMessage(error))
    } finally {
      setFollowLoading(false)
    }
  }

  const revokeSessionHandler = async (sessionId) => {
    if (!user?.uid) return
    try {
      await revokeSession(user.uid, sessionId)
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      pushToast('success', 'Session revoked.')

      if (sessionId === currentSessionId) {
        await signOutUser()
      }
    } catch (error) {
      pushToast('error', toErrorMessage(error))
    }
  }

  const onEnable2FA = async () => {
    if (!isOwnProfile) return
    try {
      const { secret, qrCodeUrl } = await generateTOTPSecret(user?.email || 'user', 'Noteflow')
      const backupCodes = randomBackupCodes()
      setProfile((prev) => ({
        ...prev,
        twoFactorEnabled: true,
        totpSecret: secret,
        totpQRCode: qrCodeUrl,
        backupCodes,
      }))
      pushToast('success', 'Scan the QR code with your authenticator app. Save your backup codes.')
    } catch (err) {
      console.error('Error generating TOTP secret:', err)
      pushToast('error', 'Failed to set up 2FA. Please try again.')
    }
  }

  const onDisable2FA = async () => {
    if (!isOwnProfile) return
    setProfile((prev) => ({ ...prev, twoFactorEnabled: false }))
    pushToast('success', '2FA disabled in profile settings.')
  }

  const updateSocial = (key, value) => {
    setProfile((prev) => ({
      ...prev,
      social: {
        ...prev.social,
        [key]: value,
      },
    }))
  }

  const updateField = (field) => (event) => {
    const value = event.target.value
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const toggleVisibility = () => {
    setProfile((prev) => ({
      ...prev,
      visibility: prev.visibility === 'public' ? 'private' : 'public',
    }))
  }

  const toggleTheme = () => {
    setProfile((prev) => {
      const next = prev.themePreference === 'dark' ? 'light' : 'dark'
      setIsDark(next === 'dark')
      return { ...prev, themePreference: next }
    })
  }

  if (!user && !targetUid) {
    return (
      <div className="h-full flex items-center justify-center bg-parchment-50 dark:bg-dark-bg p-6">
        <p className="text-sm text-ink-muted dark:text-dark-muted">Please sign in to view profile.</p>
      </div>
    )
  }

  const restrictedPrivate = profile.visibility === 'private' && !isOwnProfile && !user

  return (
    <div className="min-h-full bg-parchment-50 dark:bg-dark-bg p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-text"
            >
              Back to Notes
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-ink dark:text-dark-text">Profile</h1>
            <p className="text-sm text-ink-muted dark:text-dark-muted">
              Manage your social identity, visibility, badges, and account security.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleTheme}
              disabled={!isOwnProfile}
              className="px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
            >
              Theme: {profile.themePreference === 'dark' ? 'Dark' : 'Light'}
            </button>

            <button
              type="button"
              onClick={toggleVisibility}
              disabled={!isOwnProfile}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover disabled:opacity-60"
            >
              {profile.visibility === 'public' ? <Eye size={14} /> : <EyeOff size={14} />}
              {profile.visibility === 'public' ? 'Public' : 'Private'}
            </button>

            {!isOwnProfile && user && targetUid && (
              <FollowButton loading={followLoading} isFollowing={isFollowing} onToggle={toggleFollow} />
            )}

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-3 py-2 rounded-md text-sm bg-sage text-white hover:bg-sage-light"
            >
              Public Preview
            </button>
          </div>
        </header>

        {restrictedPrivate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
            This profile is private. Sign in to view available details.
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-8 flex items-center justify-center gap-2 text-ink-muted dark:text-dark-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading profile...
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 md:p-6">
              <form onSubmit={onSave} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="w-24 h-24 rounded-full border border-parchment-200 dark:border-dark-border overflow-hidden bg-parchment-100 dark:bg-dark-hover flex items-center justify-center shrink-0">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 size={42} className="text-ink-muted dark:text-dark-muted" />
                    )}
                  </div>

                  {isOwnProfile && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-parchment-200 dark:border-dark-border text-sm text-ink dark:text-dark-text cursor-pointer hover:bg-parchment-100 dark:hover:bg-dark-hover transition-colors w-fit">
                      {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      <input type="file" className="hidden" accept="image/*" onChange={onUploadPhoto} disabled={uploadingPhoto} />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Display name</label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={updateField('displayName')}
                      disabled={!isOwnProfile}
                      className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage disabled:opacity-70"
                    />
                    {errors.displayName && <p className="text-xs text-red-600 mt-1">{errors.displayName}</p>}
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Username</label>
                    <input
                      type="text"
                      value={profile.username}
                      onChange={updateField('username')}
                      disabled={!isOwnProfile}
                      placeholder="john_doe"
                      className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage disabled:opacity-70"
                    />
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {checkingUsername && <Loader2 size={12} className="animate-spin text-ink-muted" />}
                      <span className={usernameState.available ? 'text-emerald-700' : 'text-red-600'}>
                        {errors.username || usernameState.message}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Bio / About me</label>
                  <textarea
                    value={profile.bio}
                    onChange={updateField('bio')}
                    maxLength={BIO_MAX}
                    rows={3}
                    disabled={!isOwnProfile}
                    className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage disabled:opacity-70"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-red-600">{errors.bio || ''}</span>
                    <span className="text-ink-muted dark:text-dark-muted">{profile.bio.length}/{BIO_MAX}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Hobby / Interests</label>
                  <input
                    type="text"
                    value={profile.hobby}
                    onChange={updateField('hobby')}
                    disabled={!isOwnProfile}
                    className="mt-1 w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage disabled:opacity-70"
                  />
                </div>

                <SocialLinks
                  value={profile.social}
                  errors={errors}
                  onChange={updateSocial}
                  readOnly={!isOwnProfile}
                />

                {isOwnProfile && (
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={saving || checkingUsername}
                      className="px-4 py-2 rounded-md bg-sage text-white hover:bg-sage-light disabled:opacity-60 text-sm"
                    >
                      {saving ? 'Saving...' : 'Save profile'}
                    </button>
                  </div>
                )}
              </form>
            </section>

            <ProfileCompleteness percent={completeness.percent} items={completeness.items} />

            <ProfileStats
              notesCount={profileStats.notesCount}
              totalWords={profileStats.totalWords}
              followersCount={profileStats.followersCount}
              followingCount={profileStats.followingCount}
              storageBytes={profileStats.storageBytes}
              createdAt={profile.createdAt || user?.metadata?.creationTime}
              lastLoginAt={profile.lastLoginAt}
            />

            <BadgesGrid badges={badges} />

            {isOwnProfile && (
              <>
                <SessionsList
                  sessions={sessions}
                  loading={sessionsLoading}
                  onRevoke={revokeSessionHandler}
                  currentSessionId={currentSessionId}
                />

                <TwoFASetup
                  enabled={profile.twoFactorEnabled}
                  loading={false}
                  qrCodeUrl={profile.totpQRCode || ''}
                  backupCodes={profile.backupCodes || []}
                  totpSecret={profile.totpSecret}
                  onEnable={onEnable2FA}
                  onDisable={onDisable2FA}
                />
              </>
            )}

            <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
              <h3 className="text-sm font-semibold text-ink dark:text-dark-text">Quick actions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm bg-sage text-white hover:bg-sage-light"
                >
                  <Plus size={14} />
                  New Note
                </Link>

                <Link
                  to="/"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover"
                >
                  <Upload size={14} />
                  Import Notes
                </Link>

                <a
                  href="mailto:feedback@noteflow.app?subject=NoteFlow%20Feedback"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm border border-parchment-200 dark:border-dark-border text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover"
                >
                  <MessageCircleMore size={14} />
                  Share Feedback
                </a>
              </div>
            </section>
          </>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink dark:text-dark-text">Public Profile Preview</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-2 py-1 rounded-md text-sm text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-ink dark:text-dark-text">
                @{normalizeUsername(profile.username) || 'username'}
              </p>
              <p className="text-sm text-ink dark:text-dark-text">{profile.bio || 'No bio yet.'}</p>
              <p className="text-xs text-ink-muted dark:text-dark-muted">Visibility: {profile.visibility}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.social || {}).map(([key, value]) => {
                  if (!value) return null
                  return (
                    <a
                      key={key}
                      href={normalizeUrl(value)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs rounded border border-parchment-200 dark:border-dark-border px-2 py-1 text-ink dark:text-dark-text"
                    >
                      {key}
                    </a>
                  )
                })}
              </div>
              <p className="text-xs text-ink-muted dark:text-dark-muted">
                Followers: {profileStats.followersCount} | Notes: {profileStats.notesCount}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[220px] max-w-[340px] rounded-lg border px-3 py-2 text-sm shadow-panel ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
