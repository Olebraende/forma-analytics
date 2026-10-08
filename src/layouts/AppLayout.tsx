import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { m } from 'motion/react'
import { Menu as MenuIcon, Plus, ShieldCheck, TriangleAlert } from 'lucide-react'
import { PageSkeleton } from './PageSkeleton'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { ThemeMenu } from './ThemeMenu'
import { Decor } from './Decor'
import { Brand } from './Brand'
import { Garland } from './Garland'
import { Button, IconButton } from '@/components/ui/Button'
import { useFinance } from '@/finance/store'
import { usePrefs } from '@/app/prefs'
import { NAV } from './nav'
import styles from './AppLayout.module.css'

const CHRISTMAS_LINES = [
  'Ho ho ho! Your data never leaves this browser.',
  'Making a list and checking it twice.',
  'Wrapping up the year, one budget at a time.',
]
const HALLOWEEN_LINES = [
  'Boo! Your data stays in this browser.',
  'Nothing here is scarier than an unplanned expense.',
  'Tracking your treats, not tricking you.',
]
const FOOLS_LINES = [
  'Balancing your books and, occasionally, a spoon on our nose.',
  'All numbers are real. Only the mood is fake.',
  'Now with 0% extra seriousness.',
]

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme } = usePrefs()
  const { hasDemo, status, error, retry } = useFinance()
  const mainRef = useRef<HTMLElement>(null)
  const title = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'Forma Analytics'

  // Announce route changes and reset scroll/focus for keyboard and screen reader users.
  const firstRender = useRef(true)
  useEffect(() => {
    document.title = `${title} | Forma Analytics`
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname, title])

  const pick = (lines: string[]) => lines[new Date().getMinutes() % lines.length] as string
  const footnote = theme === 'aprilfools' ? pick(FOOLS_LINES) : theme === 'christmas' ? pick(CHRISTMAS_LINES) : theme === 'halloween' ? pick(HALLOWEEN_LINES) : 'Your data stays in this browser.'

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Decor />
      <Sidebar footnote={footnote} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} footnote={footnote} />
      <div className={styles.column}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <IconButton label="Open navigation menu" className={styles.menuButton} onClick={() => setNavOpen(true)}>
              <MenuIcon size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
            <div className={styles.mobileBrand}>
              <Brand compact />
            </div>
          </div>
          <div className={styles.headerRight}>
            <Button variant="primary" icon={<Plus size={16} strokeWidth={2} aria-hidden="true" />} onClick={() => navigate('/transactions?new=1')}>
              <span className={styles.addLabel}>Add transaction</span>
            </Button>
            <ThemeMenu />
          </div>
          {theme === 'christmas' && <Garland />}
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
          {status === 'loading' ? (
            <PageSkeleton />
          ) : (
            <>
              {status === 'error' && (
                <div role="alert" className={styles.banner} data-tone="negative">
                  <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
                  <p>{error}</p>
                  <Button size="sm" onClick={retry}>
                    Try again
                  </Button>
                </div>
              )}
              {status === 'ready' && hasDemo && (
                <div className={styles.banner}>
                  <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                  <p>
                    You are exploring fictional demo data. Add your own transactions any time, or manage it in <Link to="/settings">Settings</Link>.
                  </p>
                </div>
              )}
              <m.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                <Outlet />
              </m.div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
