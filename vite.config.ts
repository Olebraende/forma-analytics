/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * The overview is the landing route but is code-split. Preload its chunks and CSS from
 * the HTML so they download in parallel with the entry bundle instead of after it.
 */
function preloadLandingRoute(): Plugin {
  return {
    name: 'preload-landing-route',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.facadeModuleId?.endsWith('/routes/Overview.tsx'))
        if (!entry || entry.type !== 'chunk') return html
        const js = new Set<string>()
        const css = new Set<string>()
        const visit = (name: string) => {
          const c = bundle[name]
          if (!c || c.type !== 'chunk' || js.has(name) || c.isEntry) return
          js.add(name)
          c.viteMetadata?.importedCss.forEach((f) => css.add(f))
          c.imports.forEach(visit)
        }
        visit(entry.fileName)
        const base = ctx.server ? '/' : (process.env.VITE_BASE ?? '/forma-analytics/')
        const items = [
          ...[...css].filter((f) => !html.includes(f)).map((f) => ['stylesheet', base + f]),
          ...[...js].filter((f) => !html.includes(f)).map((f) => ['modulepreload', base + f]),
        ]
        // Only on the landing route, so deep links to other pages do not download unused chunks.
        const script = `if(!location.hash||location.hash==='#/'){${JSON.stringify(items)}.forEach(function(i){var l=document.createElement('link');l.rel=i[0];l.href=i[1];l.crossOrigin='';document.head.appendChild(l)})}`
        const tags = [{ tag: 'script', children: script, injectTo: 'head' as const }]
        return { html, tags }
      },
    },
  }
}

// GitHub Pages serves the site from /forma-analytics/. Hash routing keeps
// refresh and deep links working on static hosting.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/forma-analytics/',
  plugins: [react(), preloadLandingRoute()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
