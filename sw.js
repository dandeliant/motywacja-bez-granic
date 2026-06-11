/* =============================================================
   SERVICE WORKER — MBG
   Strategia: cache-first dla app shell, network-first dla CDN
   ============================================================= */

const CACHE_NAME = 'mbg-cache-v21';

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

// Fetch — NETWORK-FIRST dla HTML/CSS/JS żeby aktualizacje docierały od razu;
// cache-first dla pozostałych assetów (obrazki, fonty)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const isHTML = req.mode === 'navigate' || req.destination === 'document';
    const isCriticalAsset = ['script', 'style', 'manifest'].includes(req.destination)
                            || /\.(html|js|css|json)$/i.test(url.pathname);

    // STRATEGIA NETWORK-FIRST dla krytycznych plików (HTML, CSS, JS) —
    // dzięki temu zmiany kodu trafiają do użytkownika natychmiast po deploy
    if (isHTML || isCriticalAsset) {
        event.respondWith(
            fetch(req).then(resp => {
                if (resp.ok && url.origin === location.origin) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, clone));
                }
                return resp;
            }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
        );
        return;
    }

    // STRATEGIA CACHE-FIRST dla pozostałych zasobów (obrazki, fonty, audio)
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(resp => {
                if (resp.ok && url.origin === location.origin) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, clone));
                }
                return resp;
            }).catch(() => {
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
