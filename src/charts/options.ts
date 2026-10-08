import type Highcharts from 'highcharts'
import type { ChartColors } from './chartTheme'
import type { CartesianChartProps, DonutDatum } from './types'

const SYMBOLS = ['circle', 'square', 'diamond', 'triangle'] as const
const DASH = { solid: 'Solid', dashed: 'Dash', dotted: 'Dot' } as const

const stripes = (color: string, bg: string): Highcharts.PatternObject => ({
  pattern: { path: { d: 'M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6', stroke: color, strokeWidth: 2 }, width: 8, height: 8, backgroundColor: bg },
})

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
    xAxis: { categories, lineColor: c.axis, tickColor: c.axis, labels: { style: { color: c.subtle, fontSize: '11px' } }, crosshair: { color: c.grid, width: 1 } },
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
      shadow: false,
      style: { color: c.text, fontSize: '12.5px' },
      formatter() {
        const rows = (this.points ?? []).map((pt) => `<div style="display:flex;gap:12px;justify-content:space-between"><span style="color:${c.muted}">${pt.series.name}</span><b style="font-variant-numeric:tabular-nums">${formatValue(pt.y ?? 0)}</b></div>`)
        return `<div style="min-width:10rem"><div style="font-weight:650;margin-bottom:4px">${categories[this.points?.[0]?.index ?? 0] ?? ''}</div>${rows.join('')}</div>`
      },
    },
    plotOptions: {
      series: { animation, states: { inactive: { opacity: 0.55 } } },
      column: { borderWidth: 0, borderRadius: 3, groupPadding: 0.12, pointPadding: 0.04 },
      area: { fillOpacity: 0.18, lineWidth: 2.5 },
      line: { lineWidth: 2.5 },
    },
    series: series.map((s, i): Highcharts.SeriesOptionsType => {
      const color = c.series[i % c.series.length] as string
      const kind = s.kind ?? 'column'
      const base = { name: s.label, data: s.values, color, dashStyle: DASH[s.dash ?? 'solid'], marker: { enabled: !many, symbol: SYMBOLS[i % SYMBOLS.length], radius: 4 } }
      if (kind === 'column') return { ...base, type: 'column', color: i % 2 === 1 && series.filter((x) => (x.kind ?? 'column') === 'column').length > 1 ? stripes(color, c.surface) : color, borderColor: color, borderWidth: i % 2 === 1 ? 1 : 0 } as Highcharts.SeriesColumnOptions
      return { ...base, type: kind } as Highcharts.SeriesLineOptions
    }),
  }
}

export function donutOptions(p: { data: DonutDatum[]; formatValue: (v: number) => string; centerLabel: string; label: string; total: number } & Common): Highcharts.Options {
  const { colors: c, data, formatValue, centerLabel, label, total } = p
  const animation = p.reducedMotion ? false : { duration: 650 }
  return {
    chart: { type: 'pie', height: 220, backgroundColor: 'transparent', style: { fontFamily: 'inherit' }, spacing: [0, 0, 8, 0], animation },
    title: { text: `<b>${formatValue(total)}</b>`, useHTML: true, align: 'center', verticalAlign: 'middle', y: 2, style: { color: c.text, fontSize: '15px' } },
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
      shadow: false,
      style: { color: c.text, fontSize: '12.5px' },
      formatter() { return `<b>${this.key}</b><br/>${formatValue(this.y ?? 0)} (${Math.round(this.percentage ?? 0)}%)` },
    },
    plotOptions: { pie: { innerSize: '64%', size: '100%', borderWidth: 3, borderColor: c.surface, dataLabels: { enabled: false }, animation, states: { hover: { halo: { size: 4 } } } } },
    series: [
      {
        type: 'pie',
        name: label,
        data: data.map((d, i) => {
          const color = c.series[i % c.series.length] as string
          return { name: d.label, y: d.value, color: i % 2 === 1 ? stripes(color, c.surface) : color, borderColor: c.surface }
        }),
      },
    ],
  }
}
