import { useEffect, useRef, useState } from 'react'
import type Highcharts from 'highcharts'
import { loadHighcharts } from './highcharts'
import styles from './Charts.module.css'

/**
 * Mounts a Highcharts chart and keeps it in sync: option changes update the existing
 * chart (animated) instead of recreating it, and size changes reflow it.
 */
export function HighchartsChart({ options, height }: { options: Highcharts.Options; height: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let chart: Highcharts.Chart | undefined
    loadHighcharts()
      .then((HC) => {
        if (cancelled || !hostRef.current) return
        chart = HC.chart(hostRef.current, optionsRef.current)
        chartRef.current = chart
      })
      .catch(() => !cancelled && setFailed(true))
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => chartRef.current?.reflow())
    if (hostRef.current) ro?.observe(hostRef.current)
    return () => {
      cancelled = true
      ro?.disconnect()
      chart?.destroy()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.update(options, true, true)
  }, [options])

  if (failed) return <p className={styles.chartError}>The chart could not be loaded. The data table below has the same information.</p>
  // Fixed height reserved up front, so loading the chart library never shifts the layout.
  return <div ref={hostRef} className={styles.hc} style={{ height }} />
}
