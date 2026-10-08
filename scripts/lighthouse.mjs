// Runs Lighthouse (mobile and desktop) against key routes of a running preview/production server.
// Usage: BASE_URL=http://localhost:4173/forma-analytics/ node scripts/lighthouse.mjs
import { launch } from 'chrome-launcher'
import lighthouse, { desktopConfig } from 'lighthouse'
import { writeFileSync } from 'node:fs'

const base = process.env.BASE_URL ?? 'http://localhost:4173/forma-analytics/'
const routes = ['', 'transactions', 'budgets', 'goals', 'analytics', 'settings']
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'], chromePath: process.env.CHROME_PATH })
const rows = []
try {
  for (const form of ['mobile', 'desktop']) {
    for (const r of routes) {
      const result = await lighthouse(`${base}#/${r}`, { port: chrome.port, output: 'json', logLevel: 'error' }, form === 'desktop' ? desktopConfig : undefined)
      const lhr = result.lhr
      const s = (k) => Math.round((lhr.categories[k].score ?? 0) * 100)
      const a = lhr.audits
      rows.push({
        form, route: `/${r}`, performance: s('performance'), accessibility: s('accessibility'), bestPractices: s('best-practices'), seo: s('seo'),
        lcp: a['largest-contentful-paint'].displayValue, cls: a['cumulative-layout-shift'].displayValue, tbt: a['total-blocking-time'].displayValue,
      })
      console.log(rows.at(-1))
    }
  }
} finally {
  await chrome.kill()
}
writeFileSync('reports/lighthouse.json', JSON.stringify({ measuredAt: new Date().toISOString(), base, rows }, null, 2))
