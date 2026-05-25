// Brandible Web Push Service Worker
// Handles background push events (Tier 2) and notification clicks.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

const ICON = '/logo.png'

const routeFor = (data = {}) => {
  if (data.chat_id)                                             return '/dashboard/chats'
  if (data.type === 'new_status_post' || data.type === 'game_campaign') return '/dashboard/campaigns'
  if (data.type === 'challenge_approval' || data.type === 'submission_approved') return '/dashboard/wallet'
  if (data.type === 'cashout_approved'   || data.type === 'cashout_rejected')    return '/dashboard/wallet'
  if (data.type === 'new_message')                              return '/dashboard/chats'
  return '/dashboard/notifications'
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, data = {} } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: ICON,
      badge: ICON,
      data,
      tag: data.type || 'brandible',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = routeFor(event.notification.data || {})

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          win.navigate(url)
          return win.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
