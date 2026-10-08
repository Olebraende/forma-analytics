import { useMemo } from 'react'
import { usePrefs } from '@/app/prefs'
import { useChartColors } from './chartTheme'
import { HighchartsChart } from './HighchartsChart'
import { cartesianOptions } from './options'
import type { CartesianChartProps } from './types'

export function CartesianChart(props: CartesianChartProps) {
  const colors = useChartColors()
  const { reducedMotion } = usePrefs()
  const { categories, series, formatValue, formatTick, height = 280, label, summary } = props
  const options = useMemo(
    () => cartesianOptions({ categories, series, formatValue, formatTick, height, label, summary, colors, reducedMotion }),
    [categories, series, formatValue, formatTick, height, label, summary, colors, reducedMotion],
  )
  return <HighchartsChart options={options} height={height} />
}
