import { build as viteBuild } from 'vite'
import { build as esbuild, context as esbuildCtx } from 'esbuild'
import { mkdirSync, cpSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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

async function getViteConfig(watchMode) {
  const react = (await import('@vitejs/plugin-react')).default
  return {
    configFile: false,
    root: resolve(__dirname, 'src/popup'),
    base: './',
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

  cpSync(resolve(__dirname, 'public'), resolve(__dirname, 'dist'), { recursive: true })
  console.log('✓ Statische Dateien (manifest.json, content.css, icons/)')

  await viteBuild(await getViteConfig(false))
  console.log('✓ Popup → dist/popup/')

  await esbuild(contentOpts)
  console.log('✓ Content Script → dist/content.js')

  await esbuild(autologinOpts)
  console.log('✓ Autologin → dist/autologin.js')

  console.log('\n✅ Fertig! dist/ in Chrome laden:\n')
  console.log('   chrome://extensions/ → Entwicklermodus → Entpackte Erweiterung laden → dist/\n')
}

async function watchAll() {
  console.log('\n👁️  Watch-Modus\n')
  await buildAll()

  const cCtx = await esbuildCtx({ ...contentOpts, sourcemap: true })
  const aCtx = await esbuildCtx({ ...autologinOpts, sourcemap: true })
  await cCtx.watch()
  await aCtx.watch()
  console.log('✓ esbuild Watcher aktiv')
  console.log('💡 Nach Änderungen: chrome://extensions/ → Reload\n')

  await viteBuild(await getViteConfig(true))
}

if (isWatch) {
  watchAll().catch(e => { console.error('❌', e); process.exit(1) })
} else {
  buildAll().catch(e => { console.error('❌', e); process.exit(1) })
}
