// src/hooks/useAuth.js
// ──────────────────────────────────────────────────────────────
// Custom hook that wraps Firebase Authentication state.
// Returns the current user, loading status, and auth helpers.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import {
  getOrCreateSessionId,
  subscribeToSessionRevocation,
  upsertLastLogin,
  upsertSessionPresence,
} from '../firebase/profileService'

function getBrowserName() {
  const ua = navigator.userAgent || ''
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari'
  return 'Unknown'
}

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  // Track current session in Firestore and sign out if this session is revoked.
  useEffect(() => {
    if (!user?.uid) return undefined

    const sessionId = getOrCreateSessionId(user.uid)

    upsertLastLogin(user.uid).catch(() => {})
    upsertSessionPresence(user.uid, sessionId, {
      device: navigator.platform || 'Unknown device',
      browser: getBrowserName(),
    }).catch(() => {})

    const unsubscribe = subscribeToSessionRevocation(user.uid, sessionId, async () => {
      try {
        await signOut(auth)
      } catch {
        // Ignore sign-out errors triggered by revoked session listener.
      }
    })

    return unsubscribe
  }, [user?.uid])

  /** Sign in with Google popup */
  const signInWithGoogle = async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // User cancelled the popup — not a real error
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message)
      }
    }
  }

  /** Sign out the current user */
  const signOutUser = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      setError(err.message)
    }
  }

  /** Sign up with email/password and set display name */
  const signUpWithEmail = async (email, password, displayName) => {
    setError(null)
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName?.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() })
    }
    return result.user
  }

  /** Sign in with email/password */
  const signInWithEmail = async (email, password) => {
    setError(null)
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  /** Send reset password email */
  const resetPassword = async (email) => {
    setError(null)
    await sendPasswordResetEmail(auth, email)
  }

  /** Sign in as anonymous guest */
  const signInAsGuest = async () => {
    setError(null)
    const result = await signInAnonymously(auth)
    return result.user
  }

  const isGuest = user?.isAnonymous ?? false

  return {
    user,
    isGuest,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signInAsGuest,
    signOutUser,
  }
}
