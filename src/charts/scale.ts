/** Rounds a value range to friendly tick marks. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (hi === lo) return [0, 1]
  const rough = (hi - lo) / target
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const frac = rough / pow
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}
