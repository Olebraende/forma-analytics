import { useMemo } from 'react'
import { usePrefs } from '@/app/prefs'
import { CartesianChart } from './CartesianChart'
import { useChartColors } from './chartTheme'
import { HighchartsChart } from './HighchartsChart'
import { donutOptions } from './options'
import type { BarDatum, CartesianChartProps, ChartSeries, DonutDatum } from './types'
import { seriesColor } from './types'
import styles from './Charts.module.css'

type Simple = Omit<CartesianChartProps, 'series'> & { series: Omit<ChartSeries, 'kind'>[] }

export const LineChart = ({ series, ...rest }: Simple) => <CartesianChart {...rest} series={series.map((s) => ({ ...s, kind: 'line' as const }))} />
export const AreaChart = ({ series, ...rest }: Simple) => <CartesianChart {...rest} series={series.map((s) => ({ ...s, kind: 'area' as const }))} />
export const ColumnChart = ({ series, ...rest }: Simple) => <CartesianChart {...rest} series={series.map((s) => ({ ...s, kind: 'column' as const }))} />

export interface TrendPoint {
  label: string
  income: number
  expenses: number
  net: number
}

/** Income and expenses as columns with net cash flow as a dashed line. */
export function FinancialTrendChart({
  points,
  formatValue,
  formatTick,
  label,
  summary,
  height,
}: {
  points: TrendPoint[]
  formatValue: (v: number) => string
  formatTick?: (v: number) => string
  label: string
  summary?: string
  height?: number
}) {
  return (
    <CartesianChart
      categories={points.map((p) => p.label)}
      formatValue={formatValue}
      formatTick={formatTick}
      label={label}
      summary={summary}
      height={height}
      series={[
        { id: 'income', label: 'Income', kind: 'column', values: points.map((p) => p.income) },
        { id: 'expenses', label: 'Expenses', kind: 'column', values: points.map((p) => p.expenses) },
        { id: 'net', label: 'Net cash flow', kind: 'line', dash: 'dashed', values: points.map((p) => p.net) },
      ]}
    />
  )
}

/** Horizontal comparison bars. Series are told apart by fill style, not color alone. */
export function BarChart({
  data,
  seriesLabels,
  formatValue,
  label,
  warnOver = true,
}: {
  data: BarDatum[]
  seriesLabels: [string, string?]
  formatValue: (v: number) => string
  label: string
  /** Color the second series as a warning when it exceeds the first. */
  warnOver?: boolean
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values))
  return (
    <div className={styles.chart} role="group" aria-label={label}>
      <ul className={styles.legend} aria-hidden="true">
        {seriesLabels.map(
          (l, i) =>
            l && (
              <li key={l} className={styles.legendItem} style={{ color: 'var(--text)' }}>
                <svg width="22" height="12">
                  <rect x="2" y="1" width="18" height="10" rx="3" fill={i === 0 ? 'none' : seriesColor(0)} stroke={seriesColor(i === 0 ? 7 : 0)} strokeWidth="1.5" strokeDasharray={i === 0 ? '3 2' : undefined} />
                </svg>
                {l}
              </li>
            ),
        )}
      </ul>
      <div className={styles.bars}>
        {data.map((d) => (
          <div key={d.id} className={styles.barRow}>
            <div className={styles.barHead}>
              <span className={styles.barLabel}>{d.label}</span>
              <span className={`${styles.barValues} num`}>
                {d.values.map((v, i) => `${seriesLabels[i] ? `${seriesLabels[i]} ` : ''}${formatValue(v)}`).join(' · ')}
              </span>
            </div>
            <div className={styles.barPair}>
              {d.values.map((v, i) => (
                <div key={i} className={styles.barTrack} aria-hidden="true" style={{ opacity: i === 0 && d.values.length > 1 ? 0.9 : 1 }}>
                  <div
                    className={`${styles.barFill} ${i === 0 && d.values.length > 1 ? styles.hatch : ''}`}
                    style={{ transform: `scaleX(${v / max})`, color: seriesColor(7), background: i === 0 && d.values.length > 1 ? undefined : warnOver && v > (d.values[0] ?? 0) && d.values.length > 1 ? 'var(--negative)' : seriesColor(0) }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({
  data,
  formatValue,
  centerLabel,
  label,
  maxSlices = 7,
}: {
  data: DonutDatum[]
  formatValue: (v: number) => string
  centerLabel: string
  label: string
  maxSlices?: number
}) {
  const colors = useChartColors()
  const { reducedMotion } = usePrefs()
  const slices = useMemo(() => {
    const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
    const rest = sorted.slice(maxSlices)
    return rest.length ? [...sorted.slice(0, maxSlices), { id: 'other', label: 'Other', value: rest.reduce((s, d) => s + d.value, 0) }] : sorted
  }, [data, maxSlices])
  const total = slices.reduce((s, d) => s + d.value, 0)
  const options = useMemo(() => donutOptions({ data: slices, formatValue, centerLabel, label, total, colors, reducedMotion }), [slices, formatValue, centerLabel, label, total, colors, reducedMotion])
  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut}>
        <div className={styles.donutSvg}>
          <HighchartsChart options={options} height={220} />
        </div>
        <ul className={styles.donutLegend}>
          {slices.map((s, i) => (
            <li key={s.id} className={styles.donutRow}>
              <svg width="12" height="12" aria-hidden="true">
                <rect width="12" height="12" rx={i % 2 ? 6 : 3} fill={seriesColor(i)} />
              </svg>
              <span>{s.label}</span>
              <span className="num">{formatValue(s.value)}</span>
              <span className={`${styles.donutPct} num`}>{Math.round((s.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: string[][] }) {
  return (
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`${caption} (scrollable)`}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="num">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type { BarDatum, CartesianChartProps, ChartSeries, DonutDatum }
