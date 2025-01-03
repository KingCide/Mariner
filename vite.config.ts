import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: [
                'electron',
                'electron/main',
                'electron/common',
                'electron/renderer',
                'dockerode',
                'ssh2',
                'net',
                'fs',
                'path',
                'crypto',
                'os',
                'child_process'
              ]
            }
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '@electron': path.resolve(__dirname, 'electron')
            }
          }
        }
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: [
                'electron',
                'electron/main',
                'electron/common',
                'electron/renderer'
              ]
            }
          }
        }
      },
      renderer: {}
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@electron': path.resolve(__dirname, 'electron')
    }
  }
})
