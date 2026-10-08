import { NavLink } from 'react-router-dom'
import { m } from 'motion/react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV } from './nav'
import { Brand } from './Brand'
import { Mascot } from './Mascot'
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
  const { prefs, update, theme } = usePrefs()
  const mascot = (theme === 'christmas' || theme === 'halloween') && prefs.decorations ? theme : null
  const collapsed = prefs.sidebarCollapsed
  return (
    <m.aside
      className={styles.sidebar}
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      data-collapsed={collapsed || undefined}
    >
      {theme === 'halloween' && prefs.decorations && <Cobweb />}
      <div className={styles.top}>
        <Brand compact={collapsed} />
      </div>
      <nav aria-label="Main">
        <NavList collapsed={collapsed} idPrefix="desktop" />
      </nav>
      <div className={styles.bottom}>
        {mascot ? <Mascot kind={mascot} line={footnote} collapsed={collapsed} /> : !collapsed && <p className={styles.footnote}>{footnote}</p>}
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

function Cobweb() {
  return (
    <svg className={styles.cobweb} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M0 0L100 0M0 0L0 100M0 0L82 62M0 0L62 82M0 0L96 30M0 0L30 96" />
        <path d="M18 0Q14 14 0 18M38 0Q30 30 0 38M60 0Q46 46 0 60M82 0Q62 62 0 82" />
      </g>
    </svg>
  )
}
