import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { configure } from '@testing-library/react'

// The first render lazy-loads route chunks; slow CI runners need more than the 1s default.
configure({ asyncUtilTimeout: 8000 })

// jsdom lacks <dialog> modal support.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia

// Highcharts needs real SVG layout (getBBox etc.), which jsdom lacks. Component tests use a stub;
// real rendering is covered by the Playwright suite.
vi.mock('@/charts/highcharts', () => ({
  loadHighcharts: () => Promise.resolve({ chart: () => ({ update() {}, destroy() {}, reflow() {} }) }),
}))
