import { Ghost, Moon, Snowflake, Sparkles, Sun } from 'lucide-react'
import { usePrefs } from '@/app/prefs'
import styles from './Decor.module.css'

/** Subtle, purely decorative seasonal marks. Hidden from assistive tech and disabled via settings. */
export function Decor() {
  const { theme } = usePrefs()
  if (theme === 'christmas')
    return (
      <div className={styles.decor} aria-hidden="true">
        <Snowflake className={`${styles.a} ${styles.drift}`} size={28} strokeWidth={1.25} />
        <Snowflake className={`${styles.b} ${styles.drift}`} size={18} strokeWidth={1.25} />
        <Snowflake className={`${styles.c} ${styles.drift}`} size={22} strokeWidth={1.25} />
      </div>
    )
  if (theme === 'halloween')
    return (
      <div className={styles.decor} aria-hidden="true">
        <Moon className={styles.a} size={34} strokeWidth={1.25} />
        <Ghost className={`${styles.c} ${styles.float}`} size={24} strokeWidth={1.25} />
      </div>
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
