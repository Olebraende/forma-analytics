import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['', 'transactions', 'budgets', 'goals', 'analytics', 'settings']
const THEMES = ['light', 'dark', 'summer', 'christmas', 'halloween', 'aprilfools']

async function useTheme(page: import('@playwright/test').Page, theme: string) {
  await page.addInitScript((t) => localStorage.setItem('forma:prefs', JSON.stringify({ theme: t, demoSeeded: false })), theme)
}

test.describe('routes', () => {
  for (const r of ROUTES) {
    test(`/${r || 'overview'} loads directly and survives refresh without console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`#/${r}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(errors).toEqual([])
    })

    test(`/${r || 'overview'} has no horizontal scroll at 360px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(`#/${r}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('accessibility (axe, WCAG 2.x A/AA)', () => {
  for (const theme of THEMES) {
    for (const r of ROUTES) {
      test(`${theme} theme on /${r || 'overview'}`, async ({ page }) => {
        await useTheme(page, theme)
        await page.goto(`#/${r}`)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        if (r === '' || r === 'analytics') await expect(page.locator('.highcharts-container').first()).toBeVisible()
        await page.waitForTimeout(1200) // let entrance and chart animations settle before measuring contrast
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
      })
    }
  }
})

test('mobile drawer opens, traps focus semantics and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only')
  await page.goto('#/')
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: 'Budgets' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Budgets' })).toBeVisible()
  await expect(drawer).toBeHidden()
})

test('desktop sidebar collapses and the preference persists', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only')
  await page.goto('#/')
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
})

test('add transaction, reload, and it is still there', async ({ page }) => {
  await page.goto('#/transactions')
  await page.getByRole('button', { name: 'Add transaction' }).last().click()
  const dialog = page.getByRole('dialog', { name: 'Add transaction' })
  await dialog.getByLabel('Amount').fill('321,50')
  await dialog.getByLabel('Category').selectOption('health')
  await dialog.getByLabel('Description').fill('Playwright checkup')
  await dialog.getByRole('button', { name: 'Add transaction' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await page.getByLabel('Search').fill('Playwright checkup')
  await expect(page.getByRole('row', { name: /Playwright checkup/ })).toBeVisible()
})

test('header add button opens the form from any page', async ({ page }) => {
  await page.goto('#/budgets')
  await page.getByRole('banner').getByRole('button', { name: /Add transaction/ }).click()
  await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('theme switches live from the header menu without reload', async ({ page }) => {
  await page.goto('#/')
  await page.getByRole('button', { name: /Change theme/ }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('reduced motion preference is honoured', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('#/')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
})

test('exports a JSON backup that round-trips through import', async ({ page, isMobile }) => {
  test.skip(isMobile, 'download flow checked on desktop')
  await page.goto('#/settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download backup/ }).click()])
  const path = await download.path()
  await page.getByLabel('Choose a backup file to import').setInputFiles(path)
  const dialog = page.getByRole('dialog', { name: 'Import backup' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('0 new transactions')
})

test('no network requests leave the origin', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.origin !== 'http://localhost:4173' && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url())
  })
  for (const r of ROUTES) await page.goto(`#/${r}`)
  expect(external).toEqual([])
})

test('seasonal scenes: mascots show for Christmas and Halloween and can be turned off', async ({ page, isMobile }) => {
  test.skip(isMobile, 'sidebar mascot is shown on desktop')
  await page.addInitScript(() => localStorage.setItem('forma:prefs', JSON.stringify({ theme: 'christmas' })))
  await page.goto('#/')
  await expect(page.locator('aside')).toContainText(/Ho ho ho|checking it twice|Wrapping up/)
  await page.goto('#/settings')
  await page.getByText('Decorative seasonal effects').click()
  await expect(page.locator('html')).toHaveAttribute('data-decor', 'off')
  await expect(page.locator('aside svg[viewBox="0 0 64 64"]')).toBeHidden()
  await page.getByRole('radio', { name: /Halloween/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'halloween')
})

test('paints a first screen even before any JavaScript runs', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await ctx.newPage()
  await page.goto('')
  await expect(page.getByText('Forma Analytics', { exact: true })).toBeVisible()
  expect(await page.content()).toContain('This app needs JavaScript to run')
  await ctx.close()
})

test.describe('every theme renders under heavy CPU and network throttling (Lighthouse-like)', () => {
  for (const theme of THEMES) {
    test(theme, async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'CDP throttling is Chromium only')
      await useTheme(page, theme)
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
      await cdp.send('Network.enable')
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto('#/')
      await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible({ timeout: 25_000 })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      expect(errors).toEqual([])
    })
  }
})

test.describe('empty states pass axe in a seasonal theme', () => {
  for (const r of ['', 'transactions', 'budgets', 'goals', 'analytics']) {
    test(`/${r || 'overview'}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('forma:prefs', JSON.stringify({ theme: 'christmas', demoSeeded: true })))
      await page.goto(`#/${r}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
      await page.waitForTimeout(800)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(results.violations.map((v) => v.id)).toEqual([])
    })
  }
})

test('boot shell recovers from missing assets and has a main landmark', async ({ page }) => {
  await page.route('**/assets/*.js', (r) => r.abort())
  await page.goto('./')
  await expect(page.locator('main.boot')).toHaveCount(1)
  await expect(page.getByText(/could not start/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
})
