import type Highcharts from 'highcharts'
import type { ChartColors } from './chartTheme'
import type { CartesianChartProps, DonutDatum } from './types'

const SYMBOLS = ['circle', 'square', 'diamond', 'triangle'] as const
const DASH = { solid: 'Solid', dashed: 'Dash', dotted: 'Dot' } as const

/** '#rrggbb' + alpha -> rgba(); other formats are returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const n = parseInt(m[1] as string, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const gradient = (color: string): Highcharts.GradientColorObject => ({
  linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
  stops: [
    [0, color],
    [1, withAlpha(color, 0.68)],
  ],
})

/** A soft diagonal hatch: distinguishable without color, but quiet. */
const stripes = (color: string): Highcharts.PatternObject => ({
  pattern: { path: { d: 'M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6', stroke: color, strokeWidth: 1.6 }, width: 8, height: 8, backgroundColor: withAlpha(color, 0.2) },
})

const tooltipShadow = { color: 'rgba(16, 24, 40, 0.16)', offsetX: 0, offsetY: 6, width: 14, opacity: 1 }
const dot = (color: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>`

const credits = (c: ChartColors): Highcharts.CreditsOptions => ({
  enabled: true,
  style: { color: c.subtle, fontSize: '10px' },
  position: { align: 'right', x: -4, y: -2 },
})

interface Common {
  colors: ChartColors
  reducedMotion: boolean
}

export function cartesianOptions(p: CartesianChartProps & Common): Highcharts.Options {
  const { colors: c, categories, series, formatValue, formatTick = formatValue, height = 280, label, summary } = p
  const animation = p.reducedMotion ? false : { duration: 650 }
  const many = categories.length > 24
  return {
    chart: { height, backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [8, 8, 4, 8], animation },
    title: { text: label, style: { display: 'none' } },
    credits: credits(c),
    accessibility: {
      enabled: true,
      description: summary,
      screenReaderSection: { beforeChartFormat: '<div>{chartTitle}</div><div>{typeDescription}</div><div>{chartLongdesc}</div><div>{xAxisDescription}</div><div>{yAxisDescription}</div>' },
      keyboardNavigation: { enabled: true },
      point: { descriptionFormatter: (pt) => `${categories[pt.index] ?? ''}: ${pt.series.name}, ${formatValue(pt.y ?? 0)}.` },
    },
    xAxis: { categories, lineColor: c.axis, tickColor: c.axis, labels: { style: { color: c.subtle, fontSize: '11px' } }, crosshair: { color: withAlpha(c.text, 0.05) } },
    yAxis: {
      title: { text: undefined },
      gridLineColor: c.grid,
      gridLineDashStyle: 'Dash',
      labels: { style: { color: c.subtle, fontSize: '11px' }, formatter() { return formatTick(Number(this.value)) } },
      plotLines: [{ value: 0, color: c.axis, width: 1, zIndex: 3 }],
    },
    legend: { itemStyle: { color: c.text, fontWeight: '550', fontSize: '12.5px' }, itemHoverStyle: { color: c.text }, itemHiddenStyle: { color: c.subtle }, symbolRadius: 3 },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: c.surface,
      borderColor: c.axis,
      borderRadius: 12,
      shadow: tooltipShadow,
      padding: 12,
      style: { color: c.text, fontSize: '12.5px' },
      formatter() {
        const rows = (this.points ?? []).map((pt) => `<div style="display:flex;gap:12px;justify-content:space-between"><span style="color:${c.muted}">${dot(String(pt.color))}${pt.series.name}</span><b style="font-variant-numeric:tabular-nums">${formatValue(pt.y ?? 0)}</b></div>`)
        return `<div style="min-width:10rem"><div style="font-weight:650;margin-bottom:4px">${categories[this.points?.[0]?.index ?? 0] ?? ''}</div>${rows.join('')}</div>`
      },
    },
    plotOptions: {
      series: { animation, states: { inactive: { opacity: 0.5 }, hover: { lineWidthPlus: 1 } } },
      column: { borderWidth: 0, borderRadius: 6, groupPadding: 0.14, pointPadding: 0.05, states: { hover: { brightness: 0.06 } } },
      area: { lineWidth: 3, threshold: 0 },
      spline: { lineWidth: 3 },
      line: { lineWidth: 3 },
    },
    series: series.map((s, i): Highcharts.SeriesOptionsType => {
      const color = c.series[i % c.series.length] as string
      const kind = s.kind ?? 'column'
      const columns = series.filter((x) => (x.kind ?? 'column') === 'column').length
      const marker: Highcharts.PointMarkerOptionsObject = {
        enabled: !many,
        symbol: SYMBOLS[i % SYMBOLS.length],
        radius: 4.5,
        fillColor: c.surface,
        lineColor: color,
        lineWidth: 2.5,
        states: { hover: { radius: 6.5 } },
      }
      const base = { name: s.label, data: s.values, color, dashStyle: DASH[s.dash ?? 'solid'], marker }
      if (kind === 'column')
        return { ...base, type: 'column', color: i % 2 === 1 && columns > 1 ? stripes(color) : gradient(color), borderColor: i % 2 === 1 && columns > 1 ? color : undefined, borderWidth: i % 2 === 1 && columns > 1 ? 1.2 : 0 } as Highcharts.SeriesColumnOptions
      if (kind === 'area')
        return {
          ...base,
          type: 'areaspline',
          fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, withAlpha(color, 0.34)], [1, withAlpha(color, 0)]] },
        } as Highcharts.SeriesAreasplineOptions
      return { ...base, type: 'spline', zIndex: 5 } as Highcharts.SeriesSplineOptions
    }),
  }
}

export function donutOptions(p: { data: DonutDatum[]; formatValue: (v: number) => string; centerLabel: string; label: string; total: number } & Common): Highcharts.Options {
  const { colors: c, data, formatValue, centerLabel, label, total } = p
  const animation = p.reducedMotion ? false : { duration: 650 }
  return {
    chart: { type: 'pie', height: 220, backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [0, 0, 8, 0], animation },
    title: { text: `<b>${formatValue(total)}</b>`, useHTML: true, align: 'center', verticalAlign: 'middle', y: 2, style: { color: c.text, fontSize: '16px' } },
    subtitle: { text: centerLabel, align: 'center', verticalAlign: 'middle', y: 20, style: { color: c.subtle, fontSize: '11px' } },
    credits: credits(c),
    legend: { enabled: false },
    accessibility: {
      enabled: true,
      description: `${label}. Total ${formatValue(total)}. The list beside the chart gives every value.`,
      screenReaderSection: { beforeChartFormat: '<div>{chartTitle}</div><div>{typeDescription}</div><div>{chartLongdesc}</div><div>{xAxisDescription}</div><div>{yAxisDescription}</div>' },
      point: { descriptionFormatter: (pt) => `${pt.name}: ${formatValue(pt.y ?? 0)}, ${Math.round(((pt.y ?? 0) / (total || 1)) * 100)}% of the total.` },
    },
    tooltip: {
      backgroundColor: c.surface,
      borderColor: c.axis,
      borderRadius: 12,
      shadow: tooltipShadow,
      padding: 12,
      style: { color: c.text, fontSize: '12.5px' },
      formatter() { return `<b>${this.key}</b><br/>${formatValue(this.y ?? 0)} (${Math.round(this.percentage ?? 0)}%)` },
    },
    plotOptions: { pie: { innerSize: '68%', size: '100%', borderRadius: 5, borderWidth: 3, borderColor: c.surface, slicedOffset: 8, dataLabels: { enabled: false }, animation, states: { hover: { brightness: 0.07, halo: { size: 8, opacity: 0.12 } } }, point: { events: { mouseOver() { (this as unknown as { slice: (s: boolean) => void }).slice(true) }, mouseOut() { (this as unknown as { slice: (s: boolean) => void }).slice(false) } } } } },
    series: [
      {
        type: 'pie',
        name: label,
        data: data.map((d, i) => {
          const color = c.series[i % c.series.length] as string
          return { name: d.label, y: d.value, color: i % 2 === 1 ? stripes(color) : gradient(color), borderColor: c.surface }
        }),
      },
    ],
  }
}

export interface HeatmapProps {
  xCategories: string[]
  yCategories: string[]
  /** [xIndex, yIndex, value] */
  points: [number, number, number][]
  formatValue: (v: number) => string
  formatTick: (v: number) => string
  label: string
  summary?: string
}

export function heatmapOptions(p: HeatmapProps & Common): Highcharts.Options {
  const { colors: c, xCategories, yCategories, points, formatValue, formatTick, label, summary } = p
  const animation = p.reducedMotion ? false : { duration: 650 }
  const hue = c.series[0] as string
  const max = Math.max(1, ...points.map((pt) => pt[2]))
  const dark = (() => {
    const m = /^#([0-9a-f]{6})$/i.exec(c.surface.trim())
    if (!m) return false
    const n = parseInt(m[1] as string, 16)
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 110
  })()
  // Cell fill runs from transparent to the full hue, so pick the label color that stays legible on it.
  const labelColor = (ratio: number) => (dark ? (ratio > 0.55 ? c.surface : c.text) : ratio > 0.85 ? '#ffffff' : c.text)
  return {
    chart: { type: 'heatmap', height: Math.max(240, 56 + yCategories.length * 40), backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [8, 8, 4, 8], animation },
    title: { text: label, style: { display: 'none' } },
    credits: credits(c),
    accessibility: {
      enabled: true,
      description: summary,
      screenReaderSection: { beforeChartFormat: '<div>{chartTitle}</div><div>{typeDescription}</div><div>{chartLongdesc}</div>' },
      keyboardNavigation: { enabled: true },
      point: { descriptionFormatter: (pt) => `${yCategories[pt.y ?? 0] ?? ''} in ${xCategories[pt.x] ?? ''}: ${formatValue(Number((pt as unknown as { value: number }).value ?? 0))}.` },
    },
    xAxis: { categories: xCategories, lineWidth: 0, tickLength: 0, labels: { style: { color: c.subtle, fontSize: '11px' } } },
    yAxis: { categories: yCategories, reversed: true, title: { text: undefined }, gridLineWidth: 0, labels: { style: { color: c.muted, fontSize: '12px' } } },
    colorAxis: { min: 0, max, stops: [[0, withAlpha(hue, 0.07)], [0.5, withAlpha(hue, 0.5)], [1, hue]], labels: { style: { color: c.subtle, fontSize: '11px' }, formatter() { return formatTick(Number(this.value)) } } },
    legend: { align: 'center', verticalAlign: 'bottom', layout: 'horizontal', symbolWidth: 220, symbolHeight: 8, itemStyle: { color: c.subtle } },
    tooltip: {
      useHTML: true,
      backgroundColor: c.surface,
      borderColor: c.axis,
      borderRadius: 12,
      shadow: tooltipShadow,
      padding: 12,
      style: { color: c.text, fontSize: '12.5px' },
      formatter() { const pt = this as unknown as { x: number; y: number; value: number }; return `<b>${yCategories[pt.y] ?? ''}</b><br/>${xCategories[pt.x] ?? ''}: <b>${formatValue(pt.value ?? 0)}</b>` },
    },
    plotOptions: { heatmap: { borderWidth: 3, borderColor: c.surface, borderRadius: 8, animation: !p.reducedMotion, states: { hover: { brightness: -0.08, borderColor: c.text } } } },
    responsive: { rules: [{ condition: { maxWidth: 560 }, chartOptions: { plotOptions: { heatmap: { dataLabels: { enabled: false } } } } }] },
    series: [
      {
        type: 'heatmap',
        name: label,
        data: points.map(([x, y, value]) => ({ x, y, value, dataLabels: { style: { color: labelColor(value / max), fontSize: '10.5px', fontWeight: '600', textOutline: 'none' } } })),
        dataLabels: { enabled: true, style: { fontSize: '10.5px', fontWeight: '600', textOutline: 'none' }, formatter() { const v = (this as unknown as { value: number }).value; return v > 0 ? formatTick(v) : '' } },
      } as Highcharts.SeriesHeatmapOptions,
    ],
  }
}
