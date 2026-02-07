import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ⚠️ IMMEDIATE SERVICE WORKER CLEANUP & DISABLE
// Service worker disabled completely until fixed
async function disableAndCleanupServiceWorker() {
  try {
    console.log('🧹 [STARTUP] Disabling service workers and clearing caches...');
    
    // Step 1: Unregister all service workers IMMEDIATELY
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`🔍 [STARTUP] Found ${registrations.length} service worker registration(s)`);
      
      for (const registration of registrations) {
        try {
          const success = await registration.unregister();
          console.log(`✅ [STARTUP] Service Worker unregistered:`, registration.scope, success);
          
          // Force unregister by clearing scope
          try {
            await registration.uninstall?.();
          } catch (e) {
            // ignore
          }
        } catch (error) {
          console.error(`❌ [STARTUP] Failed to unregister SW at ${registration.scope}:`, error);
        }
      }
      
      console.log('⚠️ [STARTUP] Service Workers DISABLED - not registering new SW');
    }
    
    // Step 2: Clear all cache storages immediately
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`🔍 [STARTUP] Found ${cacheNames.length} cache storage(s):`, cacheNames);
      
      for (const cacheName of cacheNames) {
        try {
          await caches.delete(cacheName);
          console.log(`🗑️ [STARTUP] Cache deleted:`, cacheName);
        } catch (error) {
          console.error(`❌ [STARTUP] Failed to delete cache ${cacheName}:`, error);
        }
      }
    }
    
    // Step 3: Clear IndexedDB
    if ('indexedDB' in window) {
      try {
        const dbNames = await new Promise((resolve) => {
          const req = window.indexedDB.databases?.() || Promise.resolve([]);
          Promise.resolve(req).then(resolve);
        });
        
        if (Array.isArray(dbNames)) {
          for (const db of dbNames) {
            try {
              window.indexedDB.deleteDatabase(db.name);
              console.log(`🗑️ [STARTUP] IndexedDB deleted:`, db.name);
            } catch (error) {
              console.error(`❌ [STARTUP] Failed to delete IndexedDB ${db.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ [STARTUP] Could not enumerate IndexedDB:`, error);
      }
    }
    
    // Step 4: Preserve authentication data - NEVER clear localStorage on refresh
    try {
      // Check if we have valid authentication tokens
      const hasAuthTokens = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      const userRole = localStorage.getItem('userRole');
      
      if (hasAuthTokens && userRole === 'super_admin') {
        console.log('🔐 [STARTUP] Super admin session detected - preserving all data');
        // Do NOT clear anything for super admin
      } else {
        // Only clear for non-authenticated users
        const authKeys = ['token', 'user', 'userRole', 'authToken', 'adminToken', 'refresh_token', 'superAdminId', 'superAdminName', 'superAdminEmail', 'isAuthenticated', 'authMethod', 'loginTimestamp', 'sessionPersistent'];
        let hasAnyAuthData = false;
        authKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            hasAnyAuthData = true;
          }
        });
        
        if (!hasAnyAuthData) {
          // Only clear if no authentication data exists at all
          localStorage.clear();
          sessionStorage.clear();
          console.log('🗑️ [STARTUP] No auth data found - cleared storage');
        } else {
          console.log('🔐 [STARTUP] Authentication data preserved');
        }
      }
    } catch (error) {
      console.error('❌ [STARTUP] Failed to manage storage:', error);
    }
    
    // Step 5: Clear cookies
    try {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      console.log('🗑️ [STARTUP] Cookies cleared');
    } catch (error) {
      console.error('❌ [STARTUP] Failed to clear cookies:', error);
    }
    
    console.log('✅ [STARTUP] Service worker disabled and cleanup completed!');
    console.log('⚠️ [STARTUP] Service Workers: DISABLED (not registering)');
    return true;
  } catch (error) {
    console.error('💥 [STARTUP] Cleanup error:', error);
    return false;
  }
}

// Run cleanup immediately and before rendering
disableAndCleanupServiceWorker().catch(error => console.error('Cleanup failed:', error));
window.addEventListener('load', () => {
  disableAndCleanupServiceWorker().catch(error => console.error('Cleanup on load failed:', error));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
