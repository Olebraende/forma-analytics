import { describe, expect, it } from 'vitest'
import { allKeys } from '../../scripts/extract-i18n.mjs'
import { nb } from './nb'
import { nn } from './nn'
import { translate, detectLanguage } from './index'

describe('i18n', () => {
  it('has a Norwegian translation for every English source string', () => {
    expect(allKeys.filter((k: string) => !nb[k])).toEqual([])
    expect(allKeys.filter((k: string) => !nn[k])).toEqual([])
  })

  it('keeps placeholders identical between English and each translation', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    const bad = allKeys.filter((k: string) => ph(k) !== ph(nb[k] ?? '') || ph(k) !== ph(nn[k] ?? ''))
    expect(bad).toEqual([])
  })

  it('falls back to English for unknown text and fills placeholders', () => {
    expect(translate('nb', 'Not in the dictionary {x}', { x: 1 })).toBe('Not in the dictionary 1')
    expect(translate('nb', 'Transactions')).toBe('Transaksjoner')
    expect(translate('nn', 'Transactions')).toBe('Transaksjonar')
    expect(translate('en', 'Page {current} of {pages}', { current: 2, pages: 5 })).toBe('Page 2 of 5')
  })

  it('detects Norwegian variants from the browser language', () => {
    const set = (l: string) => Object.defineProperty(navigator, 'language', { value: l, configurable: true })
    set('nb-NO')
    expect(detectLanguage()).toBe('nb')
    set('nn-NO')
    expect(detectLanguage()).toBe('nn')
    set('en-US')
    expect(detectLanguage()).toBe('en')
  })
})
