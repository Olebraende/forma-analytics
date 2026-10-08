import type { LucideIcon } from 'lucide-react'
import { Ghost, Moon, Snowflake, Sparkles, Sun, SunMedium } from 'lucide-react'

export const THEME_IDS = ['light', 'dark', 'summer', 'christmas', 'halloween', 'aprilfools'] as const
export type ThemeId = (typeof THEME_IDS)[number]
/** 'auto' follows the operating system and, when enabled, the seasonal calendar. */
export type ThemePreference = ThemeId | 'auto'

export interface ThemeMeta {
  id: ThemeId
  name: string
  description: string
  icon: LucideIcon
  scheme: 'light' | 'dark'
  /** Swatches for the picker: background, surface, accent. */
  swatch: [string, string, string]
}

export const THEMES: readonly ThemeMeta[] = [
  { id: 'light', name: 'Light', description: 'Bright and neutral. The default.', icon: Sun, scheme: 'light', swatch: ['#f6f7f9', '#ffffff', '#2563eb'] },
  { id: 'dark', name: 'Dark', description: 'Deep surfaces with muted accents.', icon: Moon, scheme: 'dark', swatch: ['#0b0f17', '#121826', '#3b6fe0'] },
  { id: 'summer', name: 'Summer', description: 'Warm whites and coastal teal.', icon: SunMedium, scheme: 'light', swatch: ['#fffaf0', '#fffdf8', '#0e7490'] },
  { id: 'christmas', name: 'Christmas', description: 'Berry red, pine green and snow.', icon: Snowflake, scheme: 'light', swatch: ['#faf4f1', '#ffffff', '#b91c1c'] },
  { id: 'halloween', name: 'Halloween', description: 'Midnight purple, pumpkin orange.', icon: Ghost, scheme: 'dark', swatch: ['#120b1c', '#1b1229', '#f97316'] },
  { id: 'aprilfools', name: 'April Fools', description: 'Deliberately unserious colors.', icon: Sparkles, scheme: 'light', swatch: ['#fdf4ff', '#ffffff', '#c026d3'] },
]

export const isThemeId = (v: unknown): v is ThemeId => THEME_IDS.includes(v as ThemeId)
export const isThemePreference = (v: unknown): v is ThemePreference => v === 'auto' || isThemeId(v)

/** Seasonal theme for a date, or null. Month is 0-based like Date#getMonth. */
export function seasonalTheme(date: Date): ThemeId | null {
  const m = date.getMonth()
  const d = date.getDate()
  if (m === 3 && d === 1) return 'aprilfools'
  if (m === 9 && d >= 24) return 'halloween'
  if (m === 11 && d <= 26) return 'christmas'
  if (m >= 5 && m <= 7) return 'summer'
  return null
}

export interface ThemeInputs {
  preference: ThemePreference
  seasonal: boolean
  systemDark: boolean
  date: Date
}

/** Manual choice always wins; 'auto' falls back to season (if enabled) then system. */
export function resolveTheme({ preference, seasonal, systemDark, date }: ThemeInputs): ThemeId {
  if (preference !== 'auto') return preference
  if (seasonal) {
    const s = seasonalTheme(date)
    if (s) return s
  }
  return systemDark ? 'dark' : 'light'
}
