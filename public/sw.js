const CACHE_NAME = 'noteflow-v4'
const ASSETS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  let requestUrl
  try {
    requestUrl = new URL(event.request.url)
  } catch {
    return
  }

  const { request } = event
  const { origin, hostname } = requestUrl
  const isFirebaseOrApiRequest =
    origin === 'https://firestore.googleapis.com' ||
    hostname.endsWith('googleapis.com') ||
    hostname.includes('firebase') ||
    hostname.endsWith('gstatic.com') ||
    hostname.endsWith('groq.com') ||
    hostname.endsWith('openai.com')

  // Never intercept Firebase, Firestore, or third-party API requests.
  if (isFirebaseOrApiRequest) {
    return
  }

  // Only handle same-origin GET requests via this cache strategy.
  if (request.method !== 'GET' || origin !== self.location.origin) {
    return
  }

  event.respondWith((async () => {
    try {
      return await fetch(request)
    } catch {
      return (await caches.match(request)) || Response.error()
    }
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  )
})
