import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import styles from './Toast.module.css'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: Tone
  message: string
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void
}

const Ctx = createContext<ToastApi>({ show: () => undefined })
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const show = useCallback(
    (message: string, tone: Tone = 'success') => {
      const id = nextId.current++
      setItems((l) => [...l.slice(-3), { id, tone, message }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500)
    },
    [dismiss],
  )
  const api = useMemo(() => ({ show }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className={styles.region} role="region" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.tone]
            return (
              <m.div
                key={t.id}
                layout
                role={t.tone === 'error' ? 'alert' : 'status'}
                className={`${styles.toast} ${styles[t.tone]}`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" className={styles.icon} />
                <p className={styles.message}>{t.message}</p>
                <button type="button" className={styles.close} aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
