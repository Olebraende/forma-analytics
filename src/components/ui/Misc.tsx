import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './Misc.module.css'

/* ---------- Segmented control (radio group) ---------- */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.segmented}>
      {options.map((o) => (
        <label key={o.id} className={styles.segment}>
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className={styles.segmentInput} />
          <span className={styles.segmentLabel}>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

/* ---------- Progress ---------- */
export function ProgressBar({ value, label, tone = 'accent' }: { value: number; label: string; tone?: 'accent' | 'positive' | 'warning' | 'negative' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={styles.progress}>
      <div className={`${styles.progressFill} ${styles[tone]}`} style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}

/* ---------- Badge ---------- */
export function Badge({ tone = 'neutral', icon, children }: { tone?: 'neutral' | 'positive' | 'warning' | 'negative' | 'accent'; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      {icon}
      {children}
    </span>
  )
}

/* ---------- Skeleton ---------- */
export function Skeleton({ height = '1rem', width = '100%', radius }: { height?: string; width?: string; radius?: string }) {
  return <span aria-hidden="true" className={styles.skeleton} style={{ height, width, borderRadius: radius }} />
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  )
}

/* ---------- Collapsible ---------- */
export function Collapsible({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: (o: boolean) => void; children: ReactNode }) {
  const id = useId()
  return (
    <div>
      <button type="button" className={styles.collapseButton} aria-expanded={open} aria-controls={id} onClick={() => onToggle(!open)}>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={styles.chevron} data-open={open || undefined} />
        {label}
      </button>
      <div id={id} className={styles.collapse} data-open={open || undefined}>
        <div className={styles.collapseInner} inert={!open}>
          {children}
        </div>
      </div>
    </div>
  )
}
