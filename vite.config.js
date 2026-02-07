import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { copyFileSync } from 'fs'

// Plugin to copy .htaccess file to dist
const copyHtaccess = () => ({
  name: 'copy-htaccess',
  closeBundle() {
    try {
      copyFileSync('.htaccess', 'dist/.htaccess')
      console.log('✅ .htaccess copied to dist directory')
    } catch (error) {
      console.warn('⚠️ Could not copy .htaccess file:', error.message)
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    copyHtaccess()
  ],
  css: {
    postcss: './postcss.config.js',
  },
  
  server: {
    port: 6788,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: {
      port: 6788,
      host: 'localhost'
    },
    // Handle client-side routing during development
    historyApiFallback: {
      index: '/index.html'
    }
  },
  
  preview: {
    port: 6788,
    host: '0.0.0.0',
    allowedHosts: 'all'
  },
  
  // Optimized build configuration for maximum performance
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', '@heroicons/react', 'lucide-react'],
          slider: ['swiper', 'swiper/react', 'swiper/modules'],
          charts: ['recharts'],
          utils: ['axios'],
          // Heavy libraries in separate chunks
          pdf: ['html2canvas', 'jspdf'],
          icons: ['react-icons']
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          if (/css/i.test(extType)) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      },
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      }
    },
    // Enable esbuild optimizations
    esbuild: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      treeShaking: true
    },
    // Additional optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    reportCompressedSize: false // Faster builds
  },

  // Performance optimizations
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
      'framer-motion',
      'lucide-react',
      'swiper',
      'swiper/react',
      'swiper/modules'
    ],
    exclude: ['html2canvas', 'jspdf'],
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true
      }
    },
    force: true // Force re-optimization for new dependencies
  },

  // Resolve optimizations
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@assets': '/src/assets'
    }
  },


})

