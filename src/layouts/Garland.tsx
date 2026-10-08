import styles from './Garland.module.css'

const COLORS = ['#ef4444', '#facc15', '#22c55e', '#f8fafc', '#fb7185']
const COUNT = 22

/** Festive string lights hanging from the header. Purely decorative. */
export function Garland() {
  return (
    <div className={styles.garland} aria-hidden="true">
      <svg className={styles.wire} viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 2 Q 2.27 14 4.54 2 T 9.08 2 T 13.62 2 T 18.16 2 T 22.7 2 T 27.24 2 T 31.78 2 T 36.32 2 T 40.86 2 T 45.4 2 T 49.94 2 T 54.48 2 T 59.02 2 T 63.56 2 T 68.1 2 T 72.64 2 T 77.18 2 T 81.72 2 T 86.26 2 T 90.8 2 T 95.34 2 T 99.88 2" fill="none" stroke="currentColor" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className={styles.bulbs}>
        {Array.from({ length: COUNT }, (_, i) => (
          <li key={i} className={styles.bulb} style={{ left: `${(i + 0.5) * (100 / COUNT)}%`, '--c': COLORS[i % COLORS.length], '--d': `${(i * 0.37) % 2.4}s`, top: i % 2 ? '9px' : '3px' } as React.CSSProperties} />
        ))}
      </ul>
    </div>
  )
}
