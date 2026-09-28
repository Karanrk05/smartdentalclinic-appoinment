// Service Worker for Smart Dental Clinic
// Provides Browser Push API handling, native desktop/mobile push reminders,
// notification actions, and client window navigation.

const CACHE_NAME = 'smartdental-push-v1';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all active clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🦷 SmartDental Appointment Reminder';
  const options = {
    body: data.body || 'You have an upcoming dental appointment with Smart Dental Clinic.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || `dental-reminder-${data.bookingRef || Date.now()}`,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: data.data || {
      url: '/',
      bookingRef: data.bookingRef || '',
      clinicPhone: data.clinicPhone || '+91 98765 43210',
    },
    actions: [
      { action: 'view', title: '📋 View Details' },
      { action: 'call', title: '📞 Call Clinic' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks on desktop and mobile
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const notifData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  if (action === 'call') {
    const phone = notifData.clinicPhone || '+919876543210';
    if (self.clients.openWindow) {
      event.waitUntil(self.clients.openWindow(`tel:${phone}`));
    }
    return;
  }

  // Default click or 'view' action: focus existing app tab or open new window
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already an open tab for this app
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            bookingRef: notifData.bookingRef,
            url: targetUrl,
          });
          return client.focus();
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  // Clean up if needed
});

// Communication channel with main application
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_LOCAL_PUSH') {
    const { title, options } = event.data;
    const notificationOptions = {
      icon: '/pwa-192x192.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'view', title: '📋 View Details' },
        { action: 'call', title: '📞 Call Clinic' },
      ],
      ...options,
    };

    self.registration.showNotification(title, notificationOptions);
  } else if (event.data.type === 'SCHEDULE_LOCAL_PUSH') {
    const { delayMs, title, options } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'view', title: '📋 View Details' },
          { action: 'call', title: '📞 Call Clinic' },
        ],
        ...options,
      });
    }, delayMs || 1000);
  } else if (event.data.type === 'PING') {
    if (event.source) {
      event.source.postMessage({ type: 'PONG', timestamp: Date.now() });
    }
  }
});
