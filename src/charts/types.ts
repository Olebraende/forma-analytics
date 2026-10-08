/**
 * Chart abstraction. Components receive normalized, typed data and know nothing
 * about transactions or budgets. The renderer is dependency-free SVG; a library
 * such as Highcharts could replace it by re-implementing these components.
 */
export interface ChartSeries {
  id: string
  label: string
  values: number[]
  kind?: 'column' | 'line' | 'area'
  dash?: 'solid' | 'dashed' | 'dotted'
}

export interface CartesianChartProps {
  categories: string[]
  series: ChartSeries[]
  /** Full-precision formatter used in tooltips and tables. */
  formatValue: (v: number) => string
  /** Short formatter for axis ticks. */
  formatTick?: (v: number) => string
  height?: number
  /** Accessible name and a longer description of what the chart shows. */
  label: string
  summary?: string
}

export interface DonutDatum {
  id: string
  label: string
  value: number
}

export interface BarDatum {
  id: string
  label: string
  /** One value per series, same order as `seriesLabels`. */
  values: number[]
}

export const SERIES_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)']
export const seriesColor = (i: number) => SERIES_COLORS[i % SERIES_COLORS.length] as string
