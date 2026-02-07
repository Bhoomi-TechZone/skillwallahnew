// Performance monitoring and optimization utilities

// Measure and log performance metrics
export const measurePerformance = () => {
  // Only run in development environment
  if (import.meta.env.MODE === 'development') {
    // Measure First Contentful Paint (FCP)
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Log performance metrics after page load
      setTimeout(() => {
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
        });

        // Log navigation timing
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          console.log(`Page Load Time: ${(navigation.loadEventEnd - navigation.loadEventStart).toFixed(2)}ms`);
          console.log(`DOM Content Loaded: ${(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toFixed(2)}ms`);
        }
      }, 1000);
    }
  }
};

// Preload critical resources for better performance
export const preloadCriticalResources = () => {
  // Preload critical routes by importing them
  const criticalRoutes = [
    () => import('../pages/AuthPage'),
    () => import('../pages/Login'),
    () => import('../pages/Register'),
    () => import('../components/DashboardSelector'),
  ];

  // Preload resources after a short delay to not block initial render
  setTimeout(() => {
    criticalRoutes.forEach((importFunction, index) => {
      // Stagger the preloading to avoid overwhelming the browser
      setTimeout(() => {
        importFunction().catch(err => {
          console.warn('Failed to preload resource:', err);
        });
      }, index * 100);
    });
  }, 2000);
};

// Web Vitals measurement (optional)
export const measureWebVitals = (metric) => {
  if (import.meta.env.MODE === 'development') {
    console.log('Web Vital:', metric);
  }
};

// Default export for convenience
export default {
  measurePerformance,
  preloadCriticalResources,
  measureWebVitals
};