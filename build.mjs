// ============================================================
// build.mjs
//
// Warum zwei Build-Tools?
// - Popup: Vite (React-App mit Code-Splitting, optimierte Bundles)
// - Content Script + AutoLogin: esbuild als IIFE, weil Chrome Content Scripts
//   keine ES-Module unterstützen
//
// npm run build  → einmaliger Build
// npm run dev    → Watcher-Modus
// ============================================================

import { build as viteBuild } from 'vite'
import { build as esbuild, context as esbuildCtx } from 'esbuild'
import { mkdirSync, cpSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// __dirname existiert in ES-Modulen nicht
const __dirname = dirname(fileURLToPath(import.meta.url))
const isWatch = process.argv.includes('--watch')

const contentOpts = {
  entryPoints: [resolve(__dirname, 'src/content/content-main.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/content.js'),
  format: 'iife',
  globalName: 'DigikabuContent',
  jsx: 'automatic',
  jsxImportSource: 'react',
  target: 'chrome100',
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  sourcemap: false,
}

const autologinOpts = {
  entryPoints: [resolve(__dirname, 'src/autologin/index.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/autologin.js'),
  format: 'iife',
  globalName: 'DigikabuAutoLogin',
  target: 'chrome100',
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  sourcemap: false,
}

// configFile: false → keine vite.config.ts nötig, alles hier definiert
async function getViteConfig(watchMode) {
  const react = (await import('@vitejs/plugin-react')).default
  return {
    configFile: false,
    root: resolve(__dirname, 'src/popup'),
    base: './',  // Relative Pfade im Build — wichtig für Chrome Extensions
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: resolve(__dirname, 'dist/popup'),
      emptyOutDir: true,
      watch: watchMode ? {} : undefined,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
}

async function buildAll() {
  rmSync(resolve(__dirname, 'dist'), { recursive: true, force: true })
  mkdirSync(resolve(__dirname, 'dist'), { recursive: true })

  // manifest.json, content.css und icons/ aus public/ direkt nach dist/ kopieren
  cpSync(resolve(__dirname, 'public'), resolve(__dirname, 'dist'), { recursive: true })
  console.log('✓ Statische Dateien (manifest.json, content.css, icons/)')

  await viteBuild(await getViteConfig(false))
  console.log('✓ Popup → dist/popup/')

  await esbuild(contentOpts)
  console.log('✓ Content Script → dist/content.js')

  await esbuild(autologinOpts)
  console.log('✓ Autologin → dist/autologin.js')

  console.log('\n✅ Fertig! dist/ ist bereit für Chrome.')
}

async function watchAll() {
  rmSync(resolve(__dirname, 'dist'), { recursive: true, force: true })
  mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
  cpSync(resolve(__dirname, 'public'), resolve(__dirname, 'dist'), { recursive: true })

  viteBuild(await getViteConfig(true))
  console.log('👀 Popup Watcher gestartet')

  const contentCtx = await esbuildCtx(contentOpts)
  await contentCtx.watch()
  console.log('👀 Content Script Watcher gestartet')

  const autologinCtx = await esbuildCtx(autologinOpts)
  await autologinCtx.watch()
  console.log('👀 AutoLogin Watcher gestartet')

  console.log('\n🔄 Watcher aktiv — warte auf Änderungen...')
}

if (isWatch) {
  watchAll()
} else {
  buildAll()
}