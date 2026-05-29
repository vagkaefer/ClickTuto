import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'

function extensionPlugin(isFirefox: boolean) {
  return {
    name: 'extension-plugin',
    closeBundle() {
      const outDir = isFirefox ? 'dist-firefox' : 'dist'

      // copy manifest
      copyFileSync('manifest.json', `${outDir}/manifest.json`)

      // copy icons from public/icons/
      try {
        mkdirSync(`${outDir}/icons`, { recursive: true })
        for (const f of readdirSync('public/icons')) {
          copyFileSync(`public/icons/${f}`, `${outDir}/icons/${f}`)
        }
      } catch {}

      // move HTML files from src/popup/ and src/editor/ to root of dist
      const popupSrc = `${outDir}/src/popup/popup.html`
      const editorSrc = `${outDir}/src/editor/editor.html`

      for (const [src, dst] of [[popupSrc, `${outDir}/popup.html`], [editorSrc, `${outDir}/editor.html`]]) {
        let html = readFileSync(src, 'utf-8')
        // browser extensions need relative paths, not absolute /
        html = html.replace(/(src|href)="\//g, '$1="')
        html = html.replace(/(src|href)="\.\.\/\.\.\//g, '$1="')
        html = html.replace(/(src|href)="\.\.\//g, '$1="')
        writeFileSync(dst, html)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'test') {
    return {
      plugins: [react()],
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['src/test/setup.ts'],
        coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/shared/**', 'src/editor/ExportPanel.tsx'] },
      },
    }
  }
  const isFirefox = mode === 'firefox'
  const outDir = isFirefox ? 'dist-firefox' : 'dist'

  return {
    plugins: [
      react(),
      extensionPlugin(isFirefox),
    ],
    define: {
      __BROWSER__: JSON.stringify(isFirefox ? 'firefox' : 'chrome'),
    },
    base: './',
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/popup.html'),
          editor: resolve(__dirname, 'src/editor/editor.html'),
          background: resolve(__dirname, 'src/background/service-worker.ts'),
          content: resolve(__dirname, 'src/content/overlay.ts'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === 'background') return 'background.js'
            if (chunk.name === 'content') return 'content.js'
            return '[name].js'
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
