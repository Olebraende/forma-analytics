import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'
import { PREFS_KEY } from '@/storage/prefs'

function Boom(): never {
  throw new Error('theme exploded')
}

describe('ErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('renders children normally', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows a visible message instead of a blank page and can reset appearance settings', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'christmas' }))
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText('theme exploded')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset appearance settings' }))
    expect(localStorage.getItem(PREFS_KEY)).toBeNull()
    expect(reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
