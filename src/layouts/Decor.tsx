import { Ghost, Moon, Snowflake, Sparkles, Star, Sun } from 'lucide-react'
import { usePrefs } from '@/app/prefs'
import styles from './Decor.module.css'

const at = (i: number, n: number, k: number) => ((i * k) % n)

function Snow() {
  return (
    <>
      {Array.from({ length: 26 }, (_, i) => {
        const icon = i % 4 === 0
        const style = {
          left: `${at(i, 100, 37)}%`,
          '--size': `${icon ? 14 + at(i, 8, 3) : 4 + at(i, 6, 5)}px`,
          '--dur': `${14 + at(i, 11, 5)}s`,
          '--delay': `-${at(i, 22, 7)}s`,
          '--dx': `${(at(i, 5, 3) - 2) * 18}px`,
        } as React.CSSProperties
        return icon ? <Snowflake key={i} className={`${styles.flake} ${styles.flakeIcon}`} style={style} strokeWidth={1.5} /> : <span key={i} className={styles.flake} style={style} />
      })}
    </>
  )
}

const BAT = 'M20 6C17 2 12 2 8 5 6 3 3 3 0 6c4 1 5 4 6 7 2-2 4-2 6 0 2-2 5-2 8 1 3-3 6-3 8-1 2-2 4-2 6 0 1-3 2-6 6-7-3-3-6-3-8-1-4-3-9-3-12 1z'

function Bat({ n }: { n: number }) {
  return (
    <div className={styles.bat} style={{ '--n': n, top: `${6 + n * 9}vh` } as React.CSSProperties}>
      <svg viewBox="0 0 40 16" width={28 + n * 6} height={(28 + n * 6) * 0.4} className={styles.flap}>
        <path d={BAT} fill="currentColor" />
      </svg>
    </div>
  )
}

/** Subtle, purely decorative seasonal marks. Hidden from assistive tech and disabled via settings. */
export function Decor() {
  const { theme } = usePrefs()
  if (theme === 'christmas')
    return (
      <div className={styles.decor} aria-hidden="true" data-theme-decor="christmas">
        <Snow />
      </div>
    )
  if (theme === 'halloween')
    return (
      <>
        <div className={styles.decor} aria-hidden="true" data-theme-decor="halloween">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className={styles.star} size={10 + (i % 3) * 3} strokeWidth={1.5} style={{ left: `${12 + i * 17}%`, top: `${14 + (i % 3) * 18}%`, animationDelay: `${i * 0.7}s` }} />
          ))}
          <Ghost className={styles.ghost} size={30} strokeWidth={1.25} />
        </div>
        <div className={styles.sky} aria-hidden="true">
          <Moon className={styles.moon} size={40} strokeWidth={1.5} />
          {[0, 1, 2].map((n) => (
            <Bat key={n} n={n} />
          ))}
        </div>
      </>
    )
  if (theme === 'summer')
    return (
      <div className={styles.decor} aria-hidden="true">
        <Sun className={`${styles.a} ${styles.spin}`} size={36} strokeWidth={1.25} />
      </div>
    )
  if (theme === 'aprilfools')
    return (
      <div className={styles.decor} aria-hidden="true">
        <Sparkles className={`${styles.a} ${styles.float}`} size={26} strokeWidth={1.25} />
        <Sparkles className={`${styles.c} ${styles.float}`} size={18} strokeWidth={1.25} />
      </div>
    )
  return null
}
