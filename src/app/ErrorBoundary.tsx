import { Component, type ErrorInfo, type ReactNode } from 'react'
import { PREFS_KEY } from '@/storage/prefs'
import styles from './ErrorBoundary.module.css'

interface State {
  error: Error | null
}

/**
 * Last line of defence: a render error must never leave a blank page. Shows what happened and offers
 * a way back, including resetting appearance preferences (a bad theme or setting is the most likely cause).
 * Saved finance data lives in IndexedDB and is not touched here.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Forma Analytics crashed while rendering', error, info.componentStack)
  }

  private resetAppearance = () => {
    try {
      localStorage.removeItem(PREFS_KEY)
    } catch {
      /* storage unavailable; reloading still helps */
    }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className={styles.wrap} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>Forma Analytics hit an unexpected error. Your saved transactions are stored separately and have not been changed.</p>
        <pre className={styles.detail}>{this.state.error.message}</pre>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => location.reload()}>
            Reload
          </button>
          <button type="button" className={styles.secondary} onClick={this.resetAppearance}>
            Reset appearance settings
          </button>
        </div>
      </main>
    )
  }
}
