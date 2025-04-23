// Cache name - update version when content changes
const CACHE_NAME = 'blockchain-social-v1';

// Assets to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/js/vendors~main.chunk.js',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// Install service worker and cache assets
self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch strategy: network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For HTML navigation requests, always try network first
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest version
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other requests, use stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Use cached version if available, and fetch an update for next time
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Update cache
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
          });
          
        return cachedResponse || fetchPromise;
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Could not parse push notification data', e);
      data = {
        title: 'New Notification',
        message: event.data.text()
      };
    }
  }
  
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: data,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'view',
        title: 'View'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Blockchain Social', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/notifications';
  
  if (data) {
    switch (data.type) {
      case 'like':
      case 'comment':
        url = `/post/${data.postId}`;
        break;
      case 'follow':
      case 'follow_request':
        url = `/profile/${data.sourceUser}`;
        break;
      case 'message':
        url = '/messages';
        break;
      default:
        url = '/notifications';
    }
  }
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Check if there is already a window open
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag.startsWith('post-comment:')) {
    event.waitUntil(syncComment(event.tag.replace('post-comment:', '')));
  } else if (event.tag.startsWith('like-post:')) {
    event.waitUntil(syncLike(event.tag.replace('like-post:', '')));
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Sync functions (Implement these based on your app's needs)
async function syncComment(id) {
  try {
    // Get the pending comment from IndexedDB or localStorage
    const pendingComments = JSON.parse(localStorage.getItem('pendingComments') || '{}');
    const comment = pendingComments[id];
    
    if (!comment) return;
    
    // Attempt to post the comment
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(comment)
    });
    
    if (response.ok) {
      // Remove from pending if successful
      delete pendingComments[id];
      localStorage.setItem('pendingComments', JSON.stringify(pendingComments));
    }
  } catch (error) {
    console.error('Error syncing comment:', error);
  }
}

async function syncLike(id) {
  try {
    // Similar implementation for likes
    console.log('Syncing like for post:', id);
  } catch (error) {
    console.error('Error syncing like:', error);
  }
}

async function syncMessages() {
  try {
    // Sync pending messages
    console.log('Syncing pending messages');
  } catch (error) {
    console.error('Error syncing messages:', error);
  }
} 