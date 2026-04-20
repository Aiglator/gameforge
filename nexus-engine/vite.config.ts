import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// vite-plugin-monaco-editor is a CJS module with `exports.default = fn`
// We resolve it safely to handle both interop shapes.
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const monacoEditorPlugin: (opts: { languageWorkers: string[] }) => import('vite').Plugin =
  (monacoEditorPluginModule as any).default ?? monacoEditorPluginModule

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@editor': path.resolve(__dirname, './src/editor'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  optimizeDeps: {
    include: ['three', 'cannon-es'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three':    ['three'],
          'cannon':   ['cannon-es'],
          'monaco':   ['monaco-editor'],
          'vue-core': ['vue', 'pinia'],
        },
      },
    },
  },
})
