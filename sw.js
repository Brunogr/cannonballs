const CACHE_NAME = 'cannon-game-v1';
const GITHUB_PAGES_PATH = '/cannonballs';

// Get the base URL dynamically
const getBaseUrl = () => {
    return location.pathname.replace(/\/sw\.js$/, '');
};

const ASSETS_TO_CACHE = [
    GITHUB_PAGES_PATH + '/',
    GITHUB_PAGES_PATH + '/index.html',
    GITHUB_PAGES_PATH + '/cannonballs.js',
    GITHUB_PAGES_PATH + '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js',
    'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
    GITHUB_PAGES_PATH + '/icons/icon-72x72.png',
    GITHUB_PAGES_PATH + '/icons/icon-96x96.png',
    GITHUB_PAGES_PATH + '/icons/icon-128x128.png',
    GITHUB_PAGES_PATH + '/icons/icon-144x144.png',
    GITHUB_PAGES_PATH + '/icons/icon-152x152.png',
    GITHUB_PAGES_PATH + '/icons/icon-192x192.png',
    GITHUB_PAGES_PATH + '/icons/icon-384x384.png',
    GITHUB_PAGES_PATH + '/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Handle the fetch event
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                // Clone the request because it's a one-time-use stream
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it's a one-time-use stream
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If fetch fails, return a fallback response for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match(GITHUB_PAGES_PATH + '/index.html');
                        }
                        return null;
                    });
            })
    );
}); 