// Push Notification Handler Worker for Smart Dental Clinic
// Used for background push events, scheduled reminders, and fallback alerts

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🦷 Dental Appointment Reminder';
  const options = {
    body: data.body || 'Upcoming appointment with Smart Dental Clinic.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || `reminder-${data.bookingRef || Date.now()}`,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data.data || { url: '/', bookingRef: data.bookingRef || '' },
    actions: [
      { action: 'view', title: '📋 View Details' },
      { action: 'call', title: '📞 Call Clinic' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  if (event.action === 'call') {
    const phone = notifData.clinicPhone || '+919876543210';
    if (self.clients.openWindow) {
      event.waitUntil(self.clients.openWindow(`tel:${phone}`));
    }
    return;
  }

  const targetUrl = notifData.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            bookingRef: notifData.bookingRef,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
