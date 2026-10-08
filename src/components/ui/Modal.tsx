import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}

/**
 * Built on the native <dialog> element: focus trapping, Escape handling,
 * inert background and focus restoration come from the platform.
 * Mount it only while open; it animates out before calling onClose.
 */
export function Modal({ title, description, onClose, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      if (dialog.open) dialog.close()
    }
  }, [])

  const requestClose = useCallback(() => {
    if (closing) return
    const reduced = document.documentElement.dataset.motion === 'reduce'
    if (reduced) return onClose()
    setClosing(true)
    window.setTimeout(onClose, 160)
  }, [closing, onClose])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-size={size}
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        requestClose()
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={requestClose}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  )
}
