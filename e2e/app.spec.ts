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
        await page.waitForTimeout(700) // let entrance animations settle before measuring contrast
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
