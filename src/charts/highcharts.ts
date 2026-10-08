import type HighchartsNS from 'highcharts'

export type HC = typeof HighchartsNS

let loading: Promise<HC> | null = null

/** Loads Highcharts and the modules we use on first need, once. Kept out of the entry bundle. */
export function loadHighcharts(): Promise<HC> {
  loading ??= (async () => {
    const { default: Highcharts } = await import('highcharts/esm/highcharts.js')
    await Promise.all([import('highcharts/esm/modules/accessibility.js'), import('highcharts/esm/modules/pattern-fill.js'), import('highcharts/esm/modules/heatmap.js')])
    return Highcharts as unknown as HC
  })().catch((e) => {
    loading = null
    throw e
  })
  return loading
}
