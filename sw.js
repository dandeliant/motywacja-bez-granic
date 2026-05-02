/* =============================================================
   SERVICE WORKER — MBG
   Strategia: cache-first dla app shell, network-first dla CDN
   ============================================================= */

const CACHE_NAME = 'mbg-cache-v3';

// Podstawowe pliki aplikacji (app shell)
const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './clock.js',
    './manifest.json',
    './icon.svg',
    './icon-maskable.svg'
];

// Instalacja — wypełnij cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Aktywacja — wyczyść stare cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

// Fetch — cache-first dla app shell, fallback do sieci
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(resp => {
                // Zapisz nowe odpowiedzi z tego samego origin do cache
                if (resp.ok && new URL(req.url).origin === location.origin) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, clone));
                }
                return resp;
            }).catch(() => {
                // Offline fallback — zwróć głównie index.html
                if (req.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});

// Obsługa powiadomień push
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'MBG', body: 'Czas na działanie!' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './icon.svg',
            badge: './icon.svg',
            vibrate: [100, 50, 100],
            tag: data.tag || 'mbg-notif',
            requireInteraction: false,
            data: { url: data.url || './index.html' }
        })
    );
});

// Kliknięcie powiadomienia — otwórz aplikację
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(list => {
            const existing = list.find(c => c.url.includes('index.html'));
            if (existing) return existing.focus();
            return clients.openWindow(event.notification.data.url || './');
        })
    );
});

// Zaplanowane przypomnienia — wyzwalane przez postMessage z strony
self.addEventListener('message', (event) => {
    if (event.data?.type === 'schedule-reminder') {
        const { title, body, delay } = event.data;
        setTimeout(() => {
            self.registration.showNotification(title, {
                body,
                icon: './icon.svg',
                vibrate: [100, 50, 100],
                tag: 'mbg-reminder'
            });
        }, delay);
    }
});
