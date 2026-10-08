import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Sparkline } from '@/charts'
import { useAnimatedNumber } from '@/components/ui/AnimatedNumber'
import { useFormat } from '@/app/prefs'
import styles from './KpiCard.module.css'

interface Props {
  label: string
  icon: ReactNode
  /** Minor units; animated between updates. */
  value: number
  /** Ratio change vs. the previous period, or null when unavailable. */
  change?: number | null
  /** Whether an increase is good news (false for expenses). */
  upIsGood?: boolean
  footnote?: string
  signed?: boolean
  /** Recent values (oldest first) drawn as a decorative trend line. */
  trend?: number[]
}

export function KpiCard({ label, icon, value, change, upIsGood = true, footnote, signed, trend }: Props) {
  const { money } = useFormat()
  const shown = useAnimatedNumber(value)
  let delta: ReactNode = null
  if (change !== undefined) {
    if (change === null) delta = <span className={styles.deltaNeutral}>No earlier data</span>
    else {
      const pct = Math.round(Math.abs(change) * 100)
      const flat = pct === 0
      const good = flat ? null : change > 0 === upIsGood
      const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
      delta = (
        <span className={styles.delta} data-tone={good === null ? 'neutral' : good ? 'good' : 'bad'}>
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
          {flat ? 'No change' : `${change > 0 ? 'Up' : 'Down'} ${pct}%`}
          <span className="sr-only"> compared with the previous period</span>
        </span>
      )
    }
  }
  return (
    <Card as="article" interactive className={styles.card}>
      <div className={styles.top}>
        <h3 className={styles.label}>{label}</h3>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className={`${styles.value} num`}>{money(shown, { signed })}</p>
      {trend && trend.length > 1 && (
        <div className={styles.spark}>
          <Sparkline values={trend} tone={upIsGood ? 'accent' : 'negative'} />
        </div>
      )}
      <div className={styles.bottom}>
        {delta}
        {footnote && <span className={styles.footnote}>{footnote}</span>}
      </div>
    </Card>
  )
}
