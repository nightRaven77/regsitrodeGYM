const CACHE_NAME = 'gymtracker-v11';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/exercises_data.js',
  './js/app.js',
  './js/analytics.js',
  './manifest.json',
  './assets/icon.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/apple-touch-icon-precomposed.png',
  './assets/favicon.ico',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

let swRestTimerId = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first for app shell & Stale-While-Revalidate for CDN/Fonts/SVG assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  const isStaticAssetOrCDN =
    event.request.url.includes('cdn.jsdelivr.net') ||
    event.request.url.includes('fonts.googleapis.com') ||
    event.request.url.includes('fonts.gstatic.com') ||
    event.request.url.includes('/assets/exercises/');

  if (isStaticAssetOrCDN) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Helper to display the Rest Timer Push Notification
function showRestFinishedNotification(customTitle, customBody) {
  const title = customTitle || '⏱️ ¡Tiempo de descanso terminado!';
  const options = {
    body: customBody || 'Es hora de tu siguiente serie. ¡A darle con todo! 💪',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    tag: 'gymtracker-rest-timer',
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 400],
    data: { url: './' },
    actions: [
      { action: 'open', title: '💪 Continuar Entrenamiento' }
    ]
  };
  return self.registration.showNotification(title, options);
}

// Listener for PWA updates & background Rest Timer scheduling
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SCHEDULE_REST_NOTIFICATION') {
    if (swRestTimerId) {
      clearTimeout(swRestTimerId);
      swRestTimerId = null;
    }
    const delayMs = Math.max(0, Number(event.data.delayMs) || 0);
    const exerciseName = event.data.exerciseName || '';
    const bodyText = exerciseName
      ? `Descanso completado para ${exerciseName}. ¡Prepárate para la siguiente serie! 💪`
      : 'Es hora de tu siguiente serie. ¡A darle con todo! 💪';

    if (delayMs > 0) {
      const timerPromise = new Promise((resolve) => {
        swRestTimerId = setTimeout(() => {
          swRestTimerId = null;
          showRestFinishedNotification('⏱️ ¡Descanso terminado!', bodyText)
            .then(resolve)
            .catch(resolve);
        }, delayMs);
      });
      if (event.waitUntil) {
        event.waitUntil(timerPromise);
      }
    }
    return;
  }

  if (event.data.type === 'CANCEL_REST_NOTIFICATION') {
    if (swRestTimerId) {
      clearTimeout(swRestTimerId);
      swRestTimerId = null;
    }
    if (self.registration && self.registration.getNotifications) {
      self.registration.getNotifications({ tag: 'gymtracker-rest-timer' }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });
    }
    return;
  }

  if (event.data.type === 'SHOW_IMMEDIATE_REST_NOTIFICATION') {
    if (swRestTimerId) {
      clearTimeout(swRestTimerId);
      swRestTimerId = null;
    }
    const p = showRestFinishedNotification(event.data.title, event.data.body);
    if (event.waitUntil) event.waitUntil(p);
  }
});

// Standard Web Push Event Listener (for server-sent VAPID push payloads)
self.addEventListener('push', (event) => {
  let payload = {
    title: '⏱️ ¡Tiempo de descanso terminado!',
    body: 'Es hora de tu siguiente serie en My GymTracker 💪'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = Object.assign(payload, parsed);
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(showRestFinishedNotification(payload.title, payload.body));
});

// Focus or open the PWA when the user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});
