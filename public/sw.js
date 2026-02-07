// ⚠️ SERVICE WORKER DISABLED - SAFE MODE
// This service worker is intentionally disabled to prevent caching and network errors.
// The application is running without service workers for stability.
// All requests go directly to the network without caching.

console.log('⚠️ [SW] Service Worker DISABLED - Running in SAFE MODE');

// Skip installation completely
self.addEventListener('install', (event) => {
  console.log('⚠️ [SW] Install event - skipping (SW disabled)');
  event.waitUntil(self.skipWaiting());
});

// Skip activation completely
self.addEventListener('activate', (event) => {
  console.log('⚠️ [SW] Activate event - skipping (SW disabled)');
  event.waitUntil(self.clients.claim());
});

// Do NOT intercept any fetch requests - let all go to network
// This prevents errors like "Network request failed and no cache available"
self.addEventListener('fetch', (event) => {
  // Log but don't handle - let browser do it naturally
  console.log('⚠️ [SW] Fetch (passing through to network):', event.request.url);
  // NOT calling event.respondWith() - this lets the request go through normally
});

console.log('✅ [SW] Service Worker loaded in DISABLED SAFE MODE');
