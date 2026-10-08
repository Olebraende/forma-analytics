import { resolveTheme, seasonalTheme } from './themes'

const d = (m: number, day: number) => new Date(2026, m - 1, day)

describe('seasonalTheme', () => {
  it.each([
    [4, 1, 'aprilfools'],
    [4, 2, null],
    [10, 23, null],
    [10, 24, 'halloween'],
    [10, 31, 'halloween'],
    [11, 15, null],
    [12, 1, 'christmas'],
    [12, 26, 'christmas'],
    [12, 27, null],
    [6, 1, 'summer'],
    [8, 31, 'summer'],
    [9, 1, null],
    [1, 15, null],
  ])('%i/%i -> %s', (m, day, expected) => expect(seasonalTheme(d(m, day))).toBe(expected))
})

describe('resolveTheme', () => {
  const base = { seasonal: true, systemDark: false, date: d(12, 10) }
  it('manual choice always wins over season and system', () => {
    expect(resolveTheme({ ...base, preference: 'light', systemDark: true })).toBe('light')
    expect(resolveTheme({ ...base, preference: 'dark' })).toBe('dark')
  })
  it('auto uses the season when enabled', () => expect(resolveTheme({ ...base, preference: 'auto' })).toBe('christmas'))
  it('auto ignores the season when disabled', () => expect(resolveTheme({ ...base, preference: 'auto', seasonal: false })).toBe('light'))
  it('auto follows the system outside seasons', () => {
    expect(resolveTheme({ preference: 'auto', seasonal: true, systemDark: true, date: d(3, 10) })).toBe('dark')
    expect(resolveTheme({ preference: 'auto', seasonal: true, systemDark: false, date: d(3, 10) })).toBe('light')
  })
})
