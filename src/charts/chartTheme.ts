import { useEffect, useState } from 'react'
import { usePrefs } from '@/app/prefs'

export interface ChartColors {
  text: string
  muted: string
  subtle: string
  grid: string
  axis: string
  surface: string
  series: string[]
}

const read = (): ChartColors => {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    text: v('--text', '#101828'),
    muted: v('--text-muted', '#475467'),
    subtle: v('--text-subtle', '#5d6b82'),
    grid: v('--border', '#e4e7ec'),
    axis: v('--border-strong', '#d0d5dd'),
    surface: v('--surface', '#ffffff'),
    series: Array.from({ length: 8 }, (_, i) => v(`--c${i + 1}`, '#2563eb')),
  }
}

/** Concrete color values for the active theme, so Highcharts can follow the CSS tokens. */
export function useChartColors(): ChartColors {
  const { theme } = usePrefs()
  const [colors, setColors] = useState<ChartColors>(read)
  useEffect(() => setColors(read()), [theme])
  return colors
}
