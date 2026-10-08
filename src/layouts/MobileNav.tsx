import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { NavList } from './Sidebar'
import { Brand } from './Brand'
import { IconButton } from '@/components/ui/Button'
import styles from './MobileNav.module.css'

/** Slide-in navigation drawer on a native modal <dialog> (focus trap and Escape included). */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    onClose()
    // Close on route change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-label="Navigation menu"
      onClose={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <Brand />
          <IconButton label="Close menu" onClick={onClose}>
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </div>
        <nav aria-label="Main">
          <NavList idPrefix="mobile" onNavigate={onClose} />
        </nav>
      </div>
    </dialog>
  )
}
