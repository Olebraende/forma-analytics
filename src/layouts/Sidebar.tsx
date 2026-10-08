import { NavLink } from 'react-router-dom'
import { m } from 'motion/react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV } from './nav'
import { Brand } from './Brand'
import { usePrefs } from '@/app/prefs'
import styles from './Sidebar.module.css'

export function NavList({ onNavigate, collapsed = false, idPrefix }: { onNavigate?: () => void; collapsed?: boolean; idPrefix: string }) {
  return (
    <ul className={styles.list}>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate} className={styles.link} title={collapsed ? label : undefined}>
            {({ isActive }) => (
              <>
                {isActive && <m.span layoutId={`${idPrefix}-indicator`} className={styles.indicator} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" className={styles.icon} />
                <span className={styles.label} data-collapsed={collapsed || undefined}>
                  {label}
                </span>
                {isActive && <span className="sr-only"> (current page)</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function Sidebar({ footnote }: { footnote: string }) {
  const { prefs, update } = usePrefs()
  const collapsed = prefs.sidebarCollapsed
  return (
    <m.aside
      className={styles.sidebar}
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      data-collapsed={collapsed || undefined}
    >
      <div className={styles.top}>
        <Brand compact={collapsed} />
      </div>
      <nav aria-label="Main">
        <NavList collapsed={collapsed} idPrefix="desktop" />
      </nav>
      <div className={styles.bottom}>
        {!collapsed && <p className={styles.footnote}>{footnote}</p>}
        <button
          type="button"
          className={styles.collapse}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => update({ sidebarCollapsed: !collapsed })}
        >
          {collapsed ? <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </m.aside>
  )
}
