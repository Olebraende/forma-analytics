import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LazyMotion } from 'motion/react'
import { ErrorBoundary } from './ErrorBoundary'
import { PrefsProvider } from './prefs'
import { FinanceProvider } from '@/finance/store'
import { ToastProvider } from '@/components/ui/Toast'
import { AppLayout } from '@/layouts/AppLayout'
import { PageSkeleton } from '@/layouts/PageSkeleton'

const loadFeatures = () => import('./motionFeatures').then((m) => m.default)

const Overview = lazy(() => import('@/routes/Overview'))
const Transactions = lazy(() => import('@/routes/Transactions'))
const Budgets = lazy(() => import('@/routes/Budgets'))
const Goals = lazy(() => import('@/routes/Goals'))
const Analytics = lazy(() => import('@/routes/Analytics'))
const Settings = lazy(() => import('@/routes/Settings'))

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <LazyMotion features={loadFeatures}>
        <ToastProvider>
          <FinanceProvider>{children}</FinanceProvider>
        </ToastProvider>
      </LazyMotion>
    </PrefsProvider>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Suspense fallback={<PageSkeleton />}><Overview /></Suspense>} />
        <Route path="transactions" element={<Suspense fallback={<PageSkeleton />}><Transactions /></Suspense>} />
        <Route path="budgets" element={<Suspense fallback={<PageSkeleton />}><Budgets /></Suspense>} />
        <Route path="goals" element={<Suspense fallback={<PageSkeleton />}><Goals /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageSkeleton />}><Analytics /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        {/* Hash routing keeps deep links and refresh working on static hosting. */}
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}
