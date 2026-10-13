import { isThemePreference, type ThemePreference } from '@/themes/themes'
import { detectLanguage, isLanguage, type Language } from '@/i18n'
import { CURRENCIES, type Currency } from '@/utils/money'

export const LOCALES = [
  { id: 'en-NO', label: 'English (Norway)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'nb-NO', label: 'Norsk bokmål' },
  { id: 'nn-NO', label: 'Norsk nynorsk' },
  { id: 'de-DE', label: 'Deutsch' },
  { id: 'sv-SE', label: 'Svenska' },
] as const

export interface Prefs {
  theme: ThemePreference
  seasonal: boolean
  currency: Currency
  locale: string
  language: Language
  motion: 'system' | 'reduce'
  decorations: boolean
  sidebarCollapsed: boolean
  /** True once the first-run demo data has been offered, so deleting it is respected. */
  demoSeeded: boolean
  /** ISO timestamp of the last JSON export. */
  lastBackup: string | null
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'light',
  seasonal: false,
  currency: 'NOK',
  locale: 'en-NO',
  language: 'en',
  motion: 'system',
  decorations: true,
  sidebarCollapsed: false,
  demoSeeded: false,
  lastBackup: null,
}

export const PREFS_KEY = 'forma:prefs'

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) {
      const language = detectLanguage()
      return language === 'en' ? DEFAULT_PREFS : { ...DEFAULT_PREFS, language, locale: language === 'nn' ? 'nn-NO' : 'nb-NO' }
    }
    const p = JSON.parse(raw) as Record<string, unknown>
    return {
      theme: isThemePreference(p.theme) ? p.theme : DEFAULT_PREFS.theme,
      seasonal: p.seasonal === true,
      currency: CURRENCIES.includes(p.currency as Currency) ? (p.currency as Currency) : DEFAULT_PREFS.currency,
      locale: LOCALES.some((l) => l.id === p.locale) ? (p.locale as string) : DEFAULT_PREFS.locale,
      language: isLanguage(p.language) ? p.language : detectLanguage(),
      motion: p.motion === 'reduce' ? 'reduce' : 'system',
      decorations: p.decorations !== false,
      sidebarCollapsed: p.sidebarCollapsed === true,
      demoSeeded: p.demoSeeded === true,
      lastBackup: typeof p.lastBackup === 'string' ? p.lastBackup : null,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* Storage can be unavailable (private mode); preferences then last for the session only. */
  }
}
