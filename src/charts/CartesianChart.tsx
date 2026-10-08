import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { niceTicks } from './scale'
import { seriesColor, type CartesianChartProps } from './types'
import { useElementWidth } from './useElementWidth'
import styles from './Charts.module.css'

const M = { top: 12, right: 12, bottom: 28, left: 52 }
const MARKERS = ['circle', 'square', 'diamond', 'triangle'] as const

export function Marker({ shape, size = 5, x = 0, y = 0, color }: { shape: (typeof MARKERS)[number]; size?: number; x?: number; y?: number; color: string }) {
  const s = size
  switch (shape) {
    case 'circle':
      return <circle cx={x} cy={y} r={s} fill={color} />
    case 'square':
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={1} fill={color} />
    case 'diamond':
      return <path d={`M${x} ${y - s * 1.3}L${x + s * 1.3} ${y}L${x} ${y + s * 1.3}L${x - s * 1.3} ${y}Z`} fill={color} />
    case 'triangle':
      return <path d={`M${x} ${y - s * 1.2}L${x + s * 1.2} ${y + s}L${x - s * 1.2} ${y + s}Z`} fill={color} />
  }
}

const markerFor = (i: number) => MARKERS[i % MARKERS.length] as (typeof MARKERS)[number]

export function CartesianChart({ categories, series, formatValue, formatTick, height = 280, label, summary }: CartesianChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')

  const visible = series.filter((s) => !hidden.has(s.id))
  const n = categories.length
  const plotW = Math.max(40, width - M.left - M.right)
  const plotH = height - M.top - M.bottom

  const { ticks, y, y0 } = useMemo(() => {
    const all = visible.flatMap((s) => s.values)
    const t = niceTicks(all.length ? Math.min(...all) : 0, all.length ? Math.max(...all) : 1)
    const lo = t[0] as number
    const hi = t[t.length - 1] as number
    const yy = (v: number) => M.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH
    return { ticks: t, y: yy, y0: yy(0) }
  }, [visible, plotH])

  const band = plotW / Math.max(1, n)
  const cx = (i: number) => M.left + band * i + band / 2
  const columns = visible.filter((s) => (s.kind ?? 'column') === 'column')
  const groupW = Math.min(band * 0.72, 56 * Math.max(1, columns.length))
  const barW = Math.max(3, groupW / Math.max(1, columns.length) - 3)
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 54))))
  const fmtTick = formatTick ?? formatValue

  const indexFromX = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect()
    return Math.min(n - 1, Math.max(0, Math.floor(((clientX - rect.left - M.left) / plotW) * n)))
  }
  const onPointer = (e: PointerEvent<SVGSVGElement>) => setActive(indexFromX(e.clientX, e.currentTarget))
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n) - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(n - 1)
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  const toggle = (id: string) =>
    setHidden((h) => {
      const next = new Set(h)
      if (next.has(id)) next.delete(id)
      else if (series.length - next.size > 1) next.add(id)
      return next
    })

  const tooltipLeft = active === null ? 0 : Math.min(width - 8, Math.max(8, cx(active)))
  const flip = active !== null && cx(active) > width * 0.6

  return (
    <div className={styles.chart}>
      <ul className={styles.legend} aria-label="Legend. Select an item to show or hide it.">
        {series.map((s, i) => {
          const off = hidden.has(s.id)
          return (
            <li key={s.id}>
              <button type="button" className={styles.legendItem} aria-pressed={!off} onClick={() => toggle(s.id)}>
                <svg width="22" height="12" aria-hidden="true">
                  {(s.kind ?? 'column') === 'column' ? <rect x="4" y="1" width="14" height="10" rx="2" fill={seriesColor(i)} /> : <line x1="0" x2="22" y1="6" y2="6" stroke={seriesColor(i)} strokeWidth="2.5" strokeDasharray={s.dash === 'dashed' ? '5 3' : s.dash === 'dotted' ? '1 3' : undefined} strokeLinecap="round" />}
                  {(s.kind ?? 'column') !== 'column' && <Marker shape={markerFor(i)} size={3.5} x={11} y={6} color={seriesColor(i)} />}
                </svg>
                <span data-off={off || undefined}>{s.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div ref={wrapRef} className={styles.plot}>
        <svg
          width={width}
          height={height}
          role="application"
          aria-roledescription="chart"
          aria-label={`${label}. ${summary ?? ''} Use left and right arrow keys to read each value.`}
          tabIndex={0}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className={styles.svg}
        >
          <defs>
            {visible.map((s) => (
              <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(series.indexOf(s))} stopOpacity="0.28" />
                <stop offset="100%" stopColor={seriesColor(series.indexOf(s))} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axisLine : styles.grid} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.tick}>
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {categories.map((c, i) =>
            i % labelEvery === 0 ? (
              <text key={`${c}-${i}`} x={cx(i)} y={height - 8} textAnchor="middle" className={styles.tick}>
                {c}
              </text>
            ) : null,
          )}
          {active !== null && <rect x={M.left + band * active} y={M.top} width={band} height={plotH} className={styles.hoverBand} />}

          {columns.map((s, ci) =>
            s.values.map((v, i) => {
              const x = cx(i) - groupW / 2 + ci * (groupW / columns.length) + 1.5
              const top = Math.min(y(v), y0)
              return <rect key={`${s.id}-${i}`} x={x} y={top} width={barW} height={Math.max(v === 0 ? 0 : 1, Math.abs(y(v) - y0))} rx={Math.min(4, barW / 2)} fill={seriesColor(series.indexOf(s))} className={styles.column} style={{ animationDelay: `${i * 18}ms` }} opacity={active === null || active === i ? 1 : 0.55} />
            }),
          )}
          {visible
            .filter((s) => s.kind === 'area' || s.kind === 'line')
            .map((s) => {
              const idx = series.indexOf(s)
              const pts = s.values.map((v, i) => `${cx(i).toFixed(1)},${y(v).toFixed(1)}`)
              const line = `M${pts.join('L')}`
              const area = `${line}L${cx(n - 1).toFixed(1)},${y0.toFixed(1)}L${cx(0).toFixed(1)},${y0.toFixed(1)}Z`
              return (
                <g key={s.id}>
                  {s.kind === 'area' && <path d={area} fill={`url(#${uid}-${s.id})`} className={styles.areaFill} />}
                  <path d={line} fill="none" stroke={seriesColor(idx)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dash === 'dashed' ? '7 5' : s.dash === 'dotted' ? '1 6' : undefined} pathLength={s.dash && s.dash !== 'solid' ? undefined : 1} className={s.dash && s.dash !== 'solid' ? styles.lineFade : styles.line} />
                  {(n <= 24 || active !== null) &&
                    s.values.map((v, i) => (n <= 24 || active === i) && <Marker key={i} shape={markerFor(idx)} size={active === i ? 5.5 : 3.5} x={cx(i)} y={y(v)} color={seriesColor(idx)} />)}
                </g>
              )
            })}
        </svg>
        {active !== null && (
          <div className={styles.tooltip} style={{ left: tooltipLeft, transform: `translateX(${flip ? '-100%' : '0'}) translateX(${flip ? -12 : 12}px)` }} role="presentation">
            <p className={styles.tooltipTitle}>{categories[active]}</p>
            <ul>
              {visible.map((s) => (
                <li key={s.id}>
                  <svg width="12" height="12" aria-hidden="true">
                    <Marker shape={(s.kind ?? 'column') === 'column' ? 'square' : markerFor(series.indexOf(s))} size={4.5} x={6} y={6} color={seriesColor(series.indexOf(s))} />
                  </svg>
                  <span>{s.label}</span>
                  <strong className="num">{formatValue(s.values[active] ?? 0)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {active !== null ? `${categories[active]}: ${visible.map((s) => `${s.label} ${formatValue(s.values[active] ?? 0)}`).join(', ')}` : ''}
        </p>
      </div>
    </div>
  )
}
