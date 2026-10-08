import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import styles from './Menu.module.css'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  description?: string
  /** Marks the currently selected option (menuitemradio). */
  checked?: boolean
  tone?: 'danger'
  onSelect: () => void
}

interface Props {
  label: string
  trigger: (props: { open: boolean; props: Record<string, unknown> }) => ReactNode
  items: MenuItem[]
  align?: 'start' | 'end'
  radio?: boolean
}

export function Menu({ label, trigger, items, align = 'end', radio }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, close])

  useEffect(() => {
    if (open) {
      const target = listRef.current?.querySelector<HTMLElement>('[aria-checked="true"], [role^="menuitem"]')
      target?.focus()
    }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = [...(listRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => {
      e.preventDefault()
      els[(n + els.length) % els.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(els.length - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') close(false)
  }

  const itemRole = radio ? 'menuitemradio' : 'menuitem'

  return (
    <div className={styles.root} ref={rootRef}>
      {trigger({
        open,
        props: {
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': open ? menuId : undefined,
          onClick: () => setOpen((o) => !o),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown' && !open) {
              e.preventDefault()
              setOpen(true)
            }
          },
        },
      })}
      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            ref={listRef}
            role="menu"
            aria-label={label}
            className={`${styles.menu} ${align === 'end' ? styles.end : styles.start}`}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role={itemRole}
                aria-checked={radio ? !!item.checked : undefined}
                tabIndex={-1}
                className={`${styles.item} ${item.tone === 'danger' ? styles.danger : ''}`}
                onClick={() => {
                  close()
                  item.onSelect()
                }}
              >
                {item.icon}
                <span className={styles.itemText}>
                  <span>{item.label}</span>
                  {item.description && <span className={styles.itemDesc}>{item.description}</span>}
                </span>
                {radio && item.checked && <span className={styles.dot} aria-hidden="true" />}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
