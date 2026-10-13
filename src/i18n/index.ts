import { nb } from './nb'
import { nn } from './nn'

export type Language = 'en' | 'nb' | 'nn'
export const LANGUAGES: { id: Language; label: string; locale: string }[] = [
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'nb', label: 'Norsk bokmål', locale: 'nb-NO' },
  { id: 'nn', label: 'Norsk nynorsk', locale: 'nn-NO' },
]

export const isLanguage = (v: unknown): v is Language => v === 'en' || v === 'nb' || v === 'nn'

/** First-run language from the browser: Norwegian variants map to bokmål, everything else to English. */
export function detectLanguage(): Language {
  try {
    const l = (navigator.language || '').toLowerCase()
    if (l.startsWith('nn')) return 'nn'
    return l.startsWith('nb') || l.startsWith('no') ? 'nb' : 'en'
  } catch {
    return 'en'
  }
}

export type Vars = Record<string, string | number>
export type TFunction = (text: string, vars?: Vars) => string

const dictionaries: Record<Language, Record<string, string>> = { en: {}, nb, nn }

/**
 * Translates an English source string. The English text is the key, so a missing
 * translation falls back to readable English instead of breaking the page.
 * Placeholders look like {name}.
 */
export function translate(lang: Language, text: string, vars?: Vars): string {
  const out = dictionaries[lang][text] ?? text
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out
}

export const makeT = (lang: Language): TFunction => (text, vars) => translate(lang, text, vars)
