// Runs Lighthouse on the Overview (mobile and desktop) and saves a screenshot of each report's score header.
// Usage: BASE_URL=https://olebraende.github.io/forma-analytics/ node scripts/lighthouse-images.mjs
import { launch } from 'chrome-launcher'
import lighthouse, { desktopConfig } from 'lighthouse'
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const base = process.env.BASE_URL ?? 'http://localhost:4173/forma-analytics/'
const dir = join(tmpdir(), 'forma-lh')
mkdirSync(dir, { recursive: true })
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
const files = []
try {
  for (const form of ['mobile', 'desktop']) {
    const r = await lighthouse(`${base}#/`, { port: chrome.port, output: 'html', logLevel: 'error' }, form === 'desktop' ? desktopConfig : undefined)
    const file = join(dir, `${form}.html`)
    writeFileSync(file, r.report)
    files.push([form, file, Object.fromEntries(Object.entries(r.lhr.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]))])
  }
} finally {
  await chrome.kill()
}
const browser = await chromium.launch()
try {
  for (const [form, file, scores] of files) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, colorScheme: 'light' })
    await page.goto(`file://${file}`)
    await page.waitForTimeout(1500)
    const gauges = page.locator('.lh-scores-header')
    await gauges.first().screenshot({ path: `docs/screenshots/lighthouse-${form}.png` })
    console.log(form, scores)
  }
} finally {
  await browser.close()
}
