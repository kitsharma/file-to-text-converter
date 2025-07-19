// Service Worker for AI Career Equalizer PWA
const CACHE_NAME = 'career-ai-v1';
const urlsToCache = [
  './examples/simple-upload.html',
  './src/FileToTextConverter.js',
  './src/CareerWizard.js',
  './src/wizard-styles.css',
  './manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Fetch event with network-first strategy for dynamic content
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // If network fails, try to get from cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If not in cache and it's a navigation request, return index page
            if (event.request.mode === 'navigate') {
              return caches.match('./examples/simple-upload.html');
            }
            
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'career-data-sync') {
    event.waitUntil(
      // Process any queued career data when connection is restored
      syncCareerData()
    );
  }
});

async function syncCareerData() {
  try {
    // Get stored career data from IndexedDB
    const storedData = await getStoredCareerData();
    
    if (storedData && storedData.length > 0) {
      // Process each stored entry
      for (const data of storedData) {
        try {
          // Send to backend when connection is restored
          await sendCareerDataToBackend(data);
          // Remove from local storage after successful sync
          await removeStoredCareerData(data.id);
        } catch (error) {
          console.error('Failed to sync career data:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getStoredCareerData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CareerAI', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['careerData'], 'readonly');
      const store = transaction.objectStore('careerData');
      const getRequest = store.getAll();
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

async function removeStoredCareerData(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CareerAI', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['careerData'], 'readwrite');
      const store = transaction.objectStore('careerData');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function sendCareerDataToBackend(data) {
  // Placeholder for actual backend integration
  console.log('Syncing career data:', data);
  
  // In a real implementation, this would send to your backend API
  // return fetch('/api/career-data', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
}