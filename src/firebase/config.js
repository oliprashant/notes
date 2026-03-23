// src/firebase/config.js
// ──────────────────────────────────────────────────────────────
// Firebase initialization — reads config from .env variables.
// ──────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase app (singleton)
const app = initializeApp(firebaseConfig)

// Auth — export the provider and auth instance
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Firestore database instance
export const db = getFirestore(app)

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser')
  }
})

export default app
