import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/lib/utils'),
    },
  },
  build: {
    target: 'chrome120',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'content-scripts/github': path.resolve(__dirname, 'src/content-scripts/github.ts'),
        'background/index': path.resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content-scripts/github') {
            return 'content-scripts/github.js';
          }
          if (chunkInfo.name === 'background/index') {
            return 'background/index.js';
          }
          return 'assets/[name]-[hash].js';
        },
        manualChunks: {
          react: ['react', 'react-dom'],
          zustand: ['zustand'],
          jszip: ['jszip'],
          tokenizer: ['gpt-tokenizer'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
