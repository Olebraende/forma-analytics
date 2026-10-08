import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { usePrefs } from '@/app/prefs'
import styles from './Sidebar.module.css'

const EGGS = [
  'You found it. This toast has no financial advice, only vibes.',
  'Your net worth is unchanged by this message. Probably.',
  'Fun fact: a budget is just a spreadsheet with ambition.',
]

export function Brand({ compact }: { compact?: boolean }) {
  const { theme } = usePrefs()
  const toast = useToast()
  const [clicks, setClicks] = useState(0)
  const fools = theme === 'aprilfools'
  return (
    <div
      className={styles.brand}
      data-fools={fools || undefined}
      onClick={() => {
        if (!fools) return
        const n = clicks + 1
        setClicks(n)
        if (n % 5 === 0) toast.show(EGGS[(n / 5 - 1) % EGGS.length] as string, 'info')
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className={styles.logo}>
        <rect width="32" height="32" rx="9" fill="var(--accent)" />
        <path d="M9 23V9h14v3.2H12.4v3.1h8.3v3.1h-8.3V23z" fill="var(--accent-contrast)" />
      </svg>
      {!compact && <span className={styles.brandName}>Forma</span>}
    </div>
  )
}
