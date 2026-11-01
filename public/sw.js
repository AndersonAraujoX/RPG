/**
 * @file public/sw.js
 * @description Service Worker do Portal Kuar-Tor (+2d6) para suporte Offline e PWA.
 * Estratégia: Cache-First com Network Fallback para assets essenciais.
 */

const CACHE_NAME = 'kuartor-vtt-v3';
const STATIC_ASSETS = [
    'tailwind.css',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
    'faixa.png',
    'manifest.json',
    '../src/core/character-sheet.js',
    '../src/core/dice-roller.js',
    '../src/core/live-sheet-controller.js',
    '../src/core/vtt-bestiary-engine.js',
    '../src/core/audio-sfx-engine.js',
    '../src/core/vtt-fog-aoe-engine.js',
    '../src/core/item-catalog-engine.js',
    '../src/core/vtt-session-persistence.js',
    '../src/core/vtt-shortcuts-controller.js',
    '../src/core/vtt-magic-integration.js',
    '../src/core/vtt-ping-drawing-engine.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Falha parcial ao pré-armazenar assets no cache:', err);
            });
        }).then(() => self.skipWaiting())
    );
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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Ignora requisições que não sejam GET ou sejam para o Firebase/Firestore
    if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
        return;
    }

    const isCodeOrHtml = event.request.url.endsWith('.html') || event.request.url.endsWith('.js') || event.request.destination === 'script' || event.request.destination === 'document';

    if (isCodeOrHtml) {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // Clona para o cache se for bem-sucedido
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback offline caso não encontre resposta
                return cachedResponse;
            });
        })
    );
});
