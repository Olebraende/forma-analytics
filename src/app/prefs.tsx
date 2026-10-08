import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '@/storage/prefs'
import { resolveTheme, THEMES, type ThemeId } from '@/themes/themes'
import { formatDate, formatMonth } from '@/utils/dates'
import { formatMoney } from '@/utils/money'
import type { Minor } from '@/types/models'

interface PrefsApi {
  prefs: Prefs
  update: (patch: Partial<Prefs>) => void
  theme: ThemeId
  reducedMotion: boolean
}

const Ctx = createContext<PrefsApi | null>(null)

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof matchMedia === 'function' ? matchMedia(query).matches : false))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => (typeof localStorage === 'undefined' ? DEFAULT_PREFS : loadPrefs()))
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [day, setDay] = useState(() => new Date().toDateString())

  // Re-evaluate the seasonal theme if the tab stays open across midnight.
  useEffect(() => {
    const t = setInterval(() => setDay(new Date().toDateString()), 10 * 60_000)
    return () => clearInterval(t)
  }, [])

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), [])
  useEffect(() => savePrefs(prefs), [prefs])

  // `day` is a dependency so the resolved theme refreshes at midnight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = useMemo(() => resolveTheme({ preference: prefs.theme, seasonal: prefs.seasonal, systemDark, date: new Date() }), [prefs.theme, prefs.seasonal, systemDark, day])
  const reducedMotion = prefs.motion === 'reduce' || systemReduced

  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.theme && root.dataset.theme !== theme && !reducedMotion) {
      root.classList.add('theme-switching')
      window.setTimeout(() => root.classList.remove('theme-switching'), 320)
    }
    root.dataset.theme = theme
    root.style.colorScheme = THEMES.find((t) => t.id === theme)?.scheme ?? 'light'
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  }, [theme, reducedMotion])

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduce' : 'full'
    document.documentElement.dataset.decor = prefs.decorations ? 'on' : 'off'
  }, [reducedMotion, prefs.decorations])

  const value = useMemo(() => ({ prefs, update, theme, reducedMotion }), [prefs, update, theme, reducedMotion])
  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={prefs.motion === 'reduce' ? 'always' : 'user'}>{children}</MotionConfig>
    </Ctx.Provider>
  )
}

export function usePrefs(): PrefsApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePrefs must be used within PrefsProvider')
  return v
}

/** Locale- and currency-aware formatters bound to current preferences. */
export function useFormat() {
  const { prefs } = usePrefs()
  const { currency, locale } = prefs
  return useMemo(
    () => ({
      currency,
      locale,
      money: (m: Minor, opts?: Parameters<typeof formatMoney>[3]) => formatMoney(m, currency, locale, opts),
      compact: (m: Minor) => formatMoney(m, currency, locale, { compact: true }),
      date: (iso: string) => formatDate(iso, locale),
      month: (key: string, style?: 'short' | 'long') => formatMonth(key, locale, style),
    }),
    [currency, locale],
  )
}
